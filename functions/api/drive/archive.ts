import { ensureColumns, noStoreHeaders, safeText } from "../_d1-utils";

type Env = {
  DB: any;
  RENTFLOW_UPLOADS?: any;
  GOOGLE_CLIENT_EMAIL?: string;
  GOOGLE_PRIVATE_KEY?: string;
  GOOGLE_DRIVE_ROOT_FOLDER_ID?: string;
};

type UploadRow = {
  id: number;
  file_name: string;
  r2_key: string;
  vehicle_number?: string;
  mime_type?: string;
  file_type?: string;
  uploaded_at?: string;
  created_at?: string;
};

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive";
const FOLDER_MIME = "application/vnd.google-apps.folder";

export async function onRequestPost({ request, env }: { request: Request; env: Env }) {
  try {
    if (!env.DB || !env.RENTFLOW_UPLOADS) {
      return Response.json({ error: "DB or R2 is not configured" }, { status: 500, headers: noStoreHeaders() });
    }
    if (!env.GOOGLE_CLIENT_EMAIL || !env.GOOGLE_PRIVATE_KEY) {
      return Response.json({ error: "Google Drive credentials are not configured" }, { status: 500, headers: noStoreHeaders() });
    }

    await ensureArchiveSchema(env);
    const body = await request.json() as { fileIds?: unknown[] };
    const fileIds = Array.isArray(body.fileIds)
      ? [...new Set(body.fileIds.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0))]
      : [];
    if (!fileIds.length) {
      return Response.json({ total: 0, uploaded: 0, skipped: 0, failed: 0, results: [] }, { headers: noStoreHeaders() });
    }

    const placeholders = fileIds.map(() => "?").join(", ");
    const { results } = await env.DB.prepare(`
      SELECT id, file_name, r2_key, vehicle_number, mime_type, file_type, uploaded_at, created_at
      FROM uploaded_files
      WHERE id IN (${placeholders})
    `).bind(...fileIds).all();
    const rows = (results || []) as UploadRow[];
    const token = await getGoogleAccessToken(env);
    const rootFolderId = await resolveRootFolder(token, env.GOOGLE_DRIVE_ROOT_FOLDER_ID);

    let uploaded = 0;
    let skipped = 0;
    let failed = 0;
    const itemResults = [];

    for (const row of rows) {
      await env.DB.prepare("UPDATE uploaded_files SET archive_status = ? WHERE id = ?").bind("archiving", row.id).run();
      try {
        const r2Key = safeText(row.r2_key);
        const object = r2Key ? await env.RENTFLOW_UPLOADS.get(r2Key) : null;
        if (!object) throw new Error("R2 object not found");

        const uploadedAt = parseDate(row.uploaded_at || row.created_at);
        const month = `${uploadedAt.getUTCFullYear()}-${String(uploadedAt.getUTCMonth() + 1).padStart(2, "0")}`;
        const vehicleNumber = safePathSegment(row.vehicle_number || "차량번호없음");
        const archiveRoot = await ensureDriveFolder(token, rootFolderId, "장기보관");
        const monthFolder = await ensureDriveFolder(token, archiveRoot, month);
        const vehicleFolder = await ensureDriveFolder(token, monthFolder, vehicleNumber);
        const fileName = safeText(row.file_name) || `file-${row.id}`;
        const existing = await findDriveFile(token, vehicleFolder, fileName);

        if (existing) {
          await updateArchiveRow(env, row.id, existing.id, driveViewUrl(existing.id), "archived");
          skipped += 1;
          itemResults.push({ id: row.id, status: "skipped", driveFileId: existing.id, driveUrl: driveViewUrl(existing.id) });
          continue;
        }

        const bytes = await object.arrayBuffer();
        const driveFile = await uploadDriveFile(token, vehicleFolder, fileName, bytes, row.mime_type || object.httpMetadata?.contentType || "application/octet-stream");
        await updateArchiveRow(env, row.id, driveFile.id, driveViewUrl(driveFile.id), "archived");
        uploaded += 1;
        itemResults.push({ id: row.id, status: "uploaded", driveFileId: driveFile.id, driveUrl: driveViewUrl(driveFile.id) });
      } catch (error) {
        failed += 1;
        await env.DB.prepare("UPDATE uploaded_files SET archive_status = ? WHERE id = ?").bind("failed", row.id).run();
        itemResults.push({ id: row.id, status: "failed", error: error instanceof Error ? error.message : String(error) });
      }
    }

    const missing = fileIds.length - rows.length;
    failed += missing;
    return Response.json({ total: fileIds.length, uploaded, skipped, failed, results: itemResults }, { headers: noStoreHeaders() });
  } catch (error) {
    console.error("drive archive failed", { error: error instanceof Error ? error.message : String(error) });
    return Response.json({ error: String(error) }, { status: 500, headers: noStoreHeaders() });
  }
}

async function ensureArchiveSchema(env: Env) {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS uploaded_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_name TEXT NOT NULL,
      r2_url TEXT NOT NULL,
      r2_key TEXT NOT NULL,
      drive_file_id TEXT,
      drive_url TEXT,
      archived_at DATETIME,
      archive_status TEXT DEFAULT 'none'
    )
  `).run();
  await ensureColumns(env.DB, "uploaded_files", [
    { name: "drive_file_id", definition: "TEXT" },
    { name: "drive_url", definition: "TEXT" },
    { name: "archived_at", definition: "DATETIME" },
    { name: "archive_status", definition: "TEXT DEFAULT 'none'" },
  ]);
}

async function updateArchiveRow(env: Env, id: number, driveFileId: string, driveUrl: string, status: string) {
  await env.DB.prepare(`
    UPDATE uploaded_files
    SET drive_file_id = ?, drive_url = ?, archived_at = CURRENT_TIMESTAMP, archive_status = ?
    WHERE id = ?
  `).bind(driveFileId, driveUrl, status, id).run();
}

async function getGoogleAccessToken(env: Env) {
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: env.GOOGLE_CLIENT_EMAIL,
    scope: DRIVE_SCOPE,
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };
  const assertion = await signJwt(claim, env.GOOGLE_PRIVATE_KEY || "");
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const data = await response.json() as { access_token?: string; error?: string; error_description?: string };
  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || `Google token failed: ${response.status}`);
  }
  return data.access_token;
}

async function resolveRootFolder(token: string, configuredRoot?: string) {
  if (configuredRoot) return configuredRoot;
  return ensureDriveFolder(token, "root", "RentFlow");
}

async function ensureDriveFolder(token: string, parentId: string, name: string) {
  const existing = await findDriveFolder(token, parentId, name);
  if (existing) return existing.id;
  const response = await fetch("https://www.googleapis.com/drive/v3/files?fields=id", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      mimeType: FOLDER_MIME,
      parents: [parentId],
    }),
  });
  const data = await response.json() as { id?: string; error?: { message?: string } };
  if (!response.ok || !data.id) throw new Error(data.error?.message || `Drive folder create failed: ${response.status}`);
  return data.id;
}

async function findDriveFolder(token: string, parentId: string, name: string) {
  return findDriveItem(token, parentId, name, `mimeType='${FOLDER_MIME}'`);
}

async function findDriveFile(token: string, parentId: string, name: string) {
  return findDriveItem(token, parentId, name, `mimeType!='${FOLDER_MIME}'`);
}

async function findDriveItem(token: string, parentId: string, name: string, mimeQuery: string) {
  const query = [
    `'${escapeDriveQuery(parentId)}' in parents`,
    `name='${escapeDriveQuery(name)}'`,
    "trashed=false",
    mimeQuery,
  ].join(" and ");
  const url = new URL("https://www.googleapis.com/drive/v3/files");
  url.searchParams.set("q", query);
  url.searchParams.set("fields", "files(id,name,webViewLink)");
  url.searchParams.set("pageSize", "1");
  const response = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
  const data = await response.json() as { files?: { id: string; name: string; webViewLink?: string }[]; error?: { message?: string } };
  if (!response.ok) throw new Error(data.error?.message || `Drive search failed: ${response.status}`);
  return data.files?.[0] || null;
}

async function uploadDriveFile(token: string, parentId: string, name: string, bytes: ArrayBuffer, mimeType: string) {
  const form = new FormData();
  form.append("metadata", new Blob([JSON.stringify({ name, parents: [parentId] })], { type: "application/json" }));
  form.append("file", new Blob([bytes], { type: mimeType || "application/octet-stream" }), name);
  const response = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const data = await response.json() as { id?: string; webViewLink?: string; error?: { message?: string } };
  if (!response.ok || !data.id) throw new Error(data.error?.message || `Drive upload failed: ${response.status}`);
  return { id: data.id, webViewLink: data.webViewLink };
}

async function signJwt(payload: Record<string, unknown>, privateKeyPem: string) {
  const header = { alg: "RS256", typ: "JWT" };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const data = `${encodedHeader}.${encodedPayload}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(privateKeyPem),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(data));
  return `${data}.${base64UrlEncode(signature)}`;
}

function pemToArrayBuffer(pem: string) {
  const normalized = pem.replace(/\\n/g, "\n");
  const base64 = normalized
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes.buffer;
}

function base64UrlEncode(value: string | ArrayBuffer) {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : new Uint8Array(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function parseDate(value?: string) {
  const parsed = value ? new Date(value) : new Date();
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function driveViewUrl(fileId: string) {
  return `https://drive.google.com/file/d/${fileId}/view`;
}

function safePathSegment(value: string) {
  return safeText(value).replace(/[\\/:*?"<>|]/g, "-") || "미지정";
}

function escapeDriveQuery(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}
