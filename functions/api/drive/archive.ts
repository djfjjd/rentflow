import { ensureColumns, noStoreHeaders, safeText } from "../_d1-utils";

type Env = {
  DB: any;
  RENTFLOW_UPLOADS?: any;
  GOOGLE_DRIVE_FOLDER_ID?: string;
  GOOGLE_SERVICE_ACCOUNT_JSON?: string;
};

type UploadRow = {
  id: number;
  file_name: string;
  r2_key: string;
  vehicle_number?: string;
  mime_type?: string;
  file_type?: string;
  record_type?: string;
  record_id?: string;
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
    const serviceAccount = parseServiceAccount(env.GOOGLE_SERVICE_ACCOUNT_JSON);
    if (!serviceAccount) {
      return Response.json({ error: "Google Drive credentials are not configured" }, { status: 500, headers: noStoreHeaders() });
    }
    const rootFolderId = safeText(env.GOOGLE_DRIVE_FOLDER_ID).trim();
    if (!rootFolderId) {
      return Response.json({ error: "GOOGLE_DRIVE_FOLDER_ID is not configured" }, { status: 500, headers: noStoreHeaders() });
    }

    await ensureArchiveSchema(env);
    const body = await request.json() as { fileIds?: unknown[] };
    const fileIds = Array.isArray(body.fileIds)
      ? [...new Set(body.fileIds.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0))]
      : [];
    if (!fileIds.length) {
      return Response.json({ total: 0, uploaded: 0, skipped: 0, failed: 0, results: [] }, { headers: noStoreHeaders() });
    }

    const rows = await fetchUploadRowsByIds(env, fileIds);
    const token = await getGoogleAccessToken(serviceAccount);
    const archiveFolderId = await getOrCreateFolder(token, rootFolderId, "장기보관");

    let uploaded = 0;
    let skipped = 0;
    let failed = 0;
    const itemResults = [];

    for (const row of rows) {
      await env.DB.prepare("UPDATE uploaded_files SET archive_status = ? WHERE id = ?").bind("archiving", row.id).run();
      let caseFolderId = "";
      try {
        const r2Key = safeText(row.r2_key);
        const object = r2Key ? await env.RENTFLOW_UPLOADS.get(r2Key) : null;
        if (!object) throw new Error("R2 object not found");

        caseFolderId = await getOrCreateFolder(token, archiveFolderId, buildTargetFolderName(row));
        const fileName = safeText(row.file_name) || `file-${row.id}`;
        const existing = await findDriveFile(token, caseFolderId, fileName);

        if (existing) {
          await updateArchiveRow(env, row.id, existing.id, driveViewUrl(existing.id), "archived");
          skipped += 1;
          itemResults.push({ id: row.id, fileName, status: "skipped", reason: "already_exists", diagnostics: buildDriveDiagnostics(caseFolderId, true), driveFileId: existing.id, driveUrl: driveViewUrl(existing.id) });
          continue;
        }

        const bytes = await object.arrayBuffer();
        const driveFile = await uploadDriveFile(token, caseFolderId, fileName, bytes, row.mime_type || object.httpMetadata?.contentType || "application/octet-stream");
        await updateArchiveRow(env, row.id, driveFile.id, driveViewUrl(driveFile.id), "archived");
        uploaded += 1;
        itemResults.push({ id: row.id, fileName, status: "uploaded", diagnostics: buildDriveDiagnostics(caseFolderId, true), driveFileId: driveFile.id, driveUrl: driveViewUrl(driveFile.id) });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        failed += 1;
        await env.DB.prepare("UPDATE uploaded_files SET archive_status = ? WHERE id = ?").bind("failed", row.id).run();
        const fileName = safeText(row.file_name) || `file-${row.id}`;
        const diagnostics = buildDriveDiagnostics(caseFolderId, Boolean(caseFolderId));
        console.error("drive archive item failed", { fileName, caseFolderIdExists: diagnostics.caseFolderIdCreated, parentsIncluded: diagnostics.parentsIncluded, googleApiError: message });
        itemResults.push({ id: row.id, fileName, status: "failed", diagnostics, error: message });
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

async function fetchUploadRowsByIds(env: Env, fileIds: number[]) {
  const rows: UploadRow[] = [];
  for (const chunk of chunkArray(fileIds, 50)) {
    const placeholders = chunk.map(() => "?").join(", ");
    const { results } = await env.DB.prepare(`
      SELECT id, file_name, r2_key, vehicle_number, mime_type, file_type, record_type, record_id, uploaded_at, created_at
      FROM uploaded_files
      WHERE id IN (${placeholders})
    `).bind(...chunk).all();
    rows.push(...((results || []) as UploadRow[]));
  }
  const order = new Map(fileIds.map((id, index) => [id, index]));
  return rows.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
}

function chunkArray<T>(items: T[], size = 50) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

async function updateArchiveRow(env: Env, id: number, driveFileId: string, driveUrl: string, status: string) {
  await env.DB.prepare(`
    UPDATE uploaded_files
    SET drive_file_id = ?, drive_url = ?, archived_at = CURRENT_TIMESTAMP, archive_status = ?
    WHERE id = ?
  `).bind(driveFileId, driveUrl, status, id).run();
}

type GoogleServiceAccount = {
  client_email: string;
  private_key: string;
};

function parseServiceAccount(value?: string): GoogleServiceAccount | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<GoogleServiceAccount>;
    if (!parsed.client_email || !parsed.private_key) return null;
    return {
      client_email: parsed.client_email,
      private_key: parsed.private_key,
    };
  } catch {
    return null;
  }
}

async function getGoogleAccessToken(serviceAccount: GoogleServiceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: serviceAccount.client_email,
    scope: DRIVE_SCOPE,
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };
  const assertion = await signJwt(claim, serviceAccount.private_key);
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

async function getOrCreateFolder(token: string, parentFolderId: string, folderName: string) {
  const existing = await findDriveFolder(token, parentFolderId, folderName);
  if (existing) return existing.id;
  const url = new URL("https://www.googleapis.com/drive/v3/files");
  url.searchParams.set("fields", "id,name,webViewLink");
  url.searchParams.set("supportsAllDrives", "true");
  const response = await fetch(url.toString(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: FOLDER_MIME,
      parents: [parentFolderId],
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
  url.searchParams.set("supportsAllDrives", "true");
  url.searchParams.set("includeItemsFromAllDrives", "true");
  const response = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
  const data = await response.json() as { files?: { id: string; name: string; webViewLink?: string }[]; error?: { message?: string } };
  if (!response.ok) throw new Error(data.error?.message || `Drive search failed: ${response.status}`);
  return data.files?.[0] || null;
}

async function uploadDriveFile(token: string, caseFolderId: string, fileName: string, bytes: ArrayBuffer, mimeType: string) {
  if (!caseFolderId) {
    throw new Error("Google Drive upload target folder is missing");
  }
  const safeMimeType = mimeType || "application/octet-stream";
  const metadata = {
    name: fileName,
    parents: [caseFolderId],
    mimeType: safeMimeType,
  };
  const parentsIncluded = Array.isArray(metadata.parents) && metadata.parents[0] === caseFolderId;
  const url = new URL("https://www.googleapis.com/upload/drive/v3/files");
  url.searchParams.set("uploadType", "resumable");
  url.searchParams.set("fields", "id,name,webViewLink");
  url.searchParams.set("supportsAllDrives", "true");
  const initResponse = await fetch(url.toString(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Type": safeMimeType,
      "X-Upload-Content-Length": String(bytes.byteLength),
    },
    body: JSON.stringify(metadata),
  });
  if (!initResponse.ok) {
    const reason = await readGoogleError(initResponse, `Drive upload session failed: ${initResponse.status}`);
    throw new Error(formatDriveUploadError(fileName, caseFolderId, parentsIncluded, reason));
  }
  const uploadUrl = initResponse.headers.get("Location");
  if (!uploadUrl) {
    throw new Error(formatDriveUploadError(fileName, caseFolderId, parentsIncluded, "Drive upload session location is missing"));
  }
  const uploadResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": safeMimeType,
      "Content-Length": String(bytes.byteLength),
    },
    body: bytes,
  });
  const data = await uploadResponse.json() as { id?: string; name?: string; webViewLink?: string; error?: { message?: string } };
  if (!uploadResponse.ok || !data.id) {
    const reason = data.error?.message || `Drive upload failed: ${uploadResponse.status}`;
    throw new Error(formatDriveUploadError(fileName, caseFolderId, parentsIncluded, reason));
  }
  return { id: data.id, webViewLink: data.webViewLink };
}

async function readGoogleError(response: Response, fallback: string) {
  const text = await response.text();
  if (!text) return fallback;
  try {
    const data = JSON.parse(text) as { error?: { message?: string } | string };
    if (typeof data.error === "string") return data.error;
    return data.error?.message || fallback;
  } catch {
    return text;
  }
}

function formatDriveUploadError(fileName: string, caseFolderId: string, parentsIncluded: boolean, googleApiError: string) {
  return `fileName=${fileName}; caseFolderIdExists=${Boolean(caseFolderId)}; parentsIncluded=${parentsIncluded}; googleApiError=${googleApiError}`;
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

function driveViewUrl(fileId: string) {
  return `https://drive.google.com/file/d/${fileId}/view`;
}

function buildDriveDiagnostics(caseFolderId: string, parentsIncluded: boolean) {
  return {
    caseFolderIdCreated: Boolean(caseFolderId),
    parentsIncluded,
  };
}

function buildTargetFolderName(row: UploadRow) {
  const vehicleNumber = safePathSegment(row.vehicle_number || "차량번호없음");
  const typeLabel = safePathSegment(recordTypeLabel(row.record_type) || "기타");
  const recordId = safePathSegment(row.record_id || "");
  return recordId ? `${vehicleNumber}_${typeLabel}_${recordId}` : `${vehicleNumber}_${typeLabel}`;
}

function recordTypeLabel(value?: string) {
  const normalized = safeText(value).toLowerCase();
  if (normalized === "dispatch") return "배차";
  if (normalized === "return") return "회차";
  if (normalized === "reservation") return "예약";
  if (normalized === "accident") return "사고";
  if (normalized === "maintenance") return "정비";
  if (normalized === "lost_item") return "분실물";
  return safeText(value);
}

function safePathSegment(value: string) {
  return safeText(value).replace(/[\\/:*?"<>|]/g, "-").trim() || "미지정";
}

function escapeDriveQuery(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}
