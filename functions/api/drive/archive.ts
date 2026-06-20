import { ensureColumns, noStoreHeaders, safeText } from "../_d1-utils";

type Env = {
  DB: any;
  RENTFLOW_UPLOADS?: any;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_REFRESH_TOKEN?: string;
  GOOGLE_DRIVE_FOLDER_ID?: string;
};

type UploadRow = {
  id: number;
  file_name: string;
  r2_url?: string;
  r2_key: string;
  vehicle_number?: string;
  mime_type?: string;
  file_type?: string;
  record_type?: string;
  record_id?: string;
  uploaded_at?: string;
  created_at?: string;
};

const FOLDER_MIME = "application/vnd.google-apps.folder";

export async function onRequestPost({ request, env }: { request: Request; env: Env }) {
  try {
    if (!env.DB || !env.RENTFLOW_UPLOADS) {
      return Response.json({ error: "DB or R2 is not configured" }, { status: 500, headers: noStoreHeaders() });
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
    const accessToken = await getGoogleAccessToken(env);
    const archiveFolderId = await getOrCreateFolder(accessToken, rootFolderId, "장기보관");
    let uploaded = 0;
    let skipped = 0;
    let r2Missing = 0;
    let failed = 0;
    const itemResults = [];

    for (const row of rows) {
      await env.DB.prepare("UPDATE uploaded_files SET archive_status = ? WHERE id = ?").bind("archiving", row.id).run();
      const fileName = safeText(row.file_name) || `file-${row.id}`;
      const folderPath = `장기보관/${buildTargetFolderName(row)}`;
      const r2Keys = resolveR2Keys(row);
      let r2ObjectFound = false;
      let caseFolderId = "";
      try {
        caseFolderId = await getOrCreateFolder(accessToken, archiveFolderId, buildTargetFolderName(row));
        const object = await getR2Object(env, r2Keys);
        r2ObjectFound = Boolean(object);
        if (!object) {
          r2Missing += 1;
          throw new Error("R2 file not found");
        }

        const existing = await findDriveFile(accessToken, caseFolderId, fileName);
        if (existing) {
          const driveUrl = driveViewUrl(existing.id);
          await updateArchiveRow(env, row.id, existing.id, driveUrl, "archived");
          skipped += 1;
          itemResults.push({ id: row.id, fileName, status: "skipped", reason: "already_exists", diagnostics: buildDiagnostics(folderPath, r2Keys, r2ObjectFound, "skipped"), driveFileId: existing.id, driveUrl });
          continue;
        }

        const mimeType = row.mime_type || object.httpMetadata?.contentType || "application/octet-stream";
        const driveFile = await uploadDriveFile(accessToken, caseFolderId, fileName, object, mimeType);
        const driveUrl = driveViewUrl(driveFile.id);
        await updateArchiveRow(env, row.id, driveFile.id, driveUrl, "archived");
        uploaded += 1;
        itemResults.push({ id: row.id, fileName, status: "uploaded", diagnostics: buildDiagnostics(folderPath, r2Keys, r2ObjectFound, "uploaded"), driveFileId: driveFile.id, driveUrl });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        failed += 1;
        await env.DB.prepare("UPDATE uploaded_files SET archive_status = ? WHERE id = ?").bind("failed", row.id).run();
        const reason = message === "R2 file not found" ? "r2_not_found" : "upload_failed";
        const diagnostics = buildDiagnostics(folderPath, r2Keys, r2ObjectFound, message);
        console.error("drive archive item failed", { fileName, folderPath, r2KeyExists: diagnostics.r2KeyExists, r2ObjectFound: diagnostics.r2ObjectFound, googleDriveUploadResult: diagnostics.googleDriveUploadResult });
        itemResults.push({ id: row.id, fileName, status: "failed", reason, diagnostics, error: message });
      }
    }

    const rowIds = new Set(rows.map((row) => row.id));
    const missingIds = fileIds.filter((id) => !rowIds.has(id));
    failed += missingIds.length;
    for (const id of missingIds) {
      itemResults.push({ id, fileName: `file-${id}`, status: "failed", reason: "db_row_not_found", error: "업로드할 파일을 찾지 못했습니다." });
    }
    const message = uploaded === 0 && skipped === 0 && failed > 0 ? "업로드할 파일을 찾지 못했습니다." : undefined;
    return Response.json({ total: fileIds.length, uploaded, skipped, r2Missing, failed, message, results: itemResults }, { headers: noStoreHeaders() });
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
      SELECT id, file_name, r2_url, r2_key, vehicle_number, mime_type, file_type, record_type, record_id, uploaded_at, created_at
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
  `).bind(driveFileId || null, driveUrl || null, status, id).run();
}

async function getR2Object(env: Env, keys: string[]) {
  for (const key of keys) {
    const object = await env.RENTFLOW_UPLOADS?.get(key);
    if (object) return object;
  }
  return null;
}

async function getGoogleAccessToken(env: Env) {
  const clientId = safeText(env.GOOGLE_CLIENT_ID).trim();
  const clientSecret = safeText(env.GOOGLE_CLIENT_SECRET).trim();
  const refreshToken = safeText(env.GOOGLE_REFRESH_TOKEN).trim();
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Google OAuth credentials are not configured");
  }
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
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

async function uploadDriveFile(token: string, caseFolderId: string, fileName: string, object: any, mimeType: string) {
  if (!caseFolderId) throw new Error("Google Drive upload target folder is missing");
  const fileSize = Number(object.size);
  const bytes = Number.isFinite(fileSize) && fileSize >= 0 ? null : await object.arrayBuffer();
  const contentLength = bytes ? bytes.byteLength : fileSize;
  const safeMimeType = mimeType || "application/octet-stream";
  const metadata = { name: fileName, parents: [caseFolderId] };
  const initUrl = new URL("https://www.googleapis.com/upload/drive/v3/files");
  initUrl.searchParams.set("uploadType", "resumable");
  initUrl.searchParams.set("fields", "id,name,webViewLink");
  initUrl.searchParams.set("supportsAllDrives", "true");
  const initResponse = await fetch(initUrl.toString(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Type": safeMimeType,
      "X-Upload-Content-Length": String(contentLength),
    },
    body: JSON.stringify(metadata),
  });
  if (!initResponse.ok) {
    const reason = await readGoogleError(initResponse, `Drive upload session failed: ${initResponse.status}`);
    throw new Error(formatDriveUploadError(fileName, caseFolderId, true, reason));
  }
  const uploadUrl = initResponse.headers.get("Location");
  if (!uploadUrl) {
    throw new Error(formatDriveUploadError(fileName, caseFolderId, true, "Drive upload session location is missing"));
  }
  const uploadResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": safeMimeType,
      "Content-Length": String(contentLength),
    },
    body: bytes || object.body,
  });
  const data = await uploadResponse.json() as { id?: string; name?: string; webViewLink?: string; error?: { message?: string } };
  if (!uploadResponse.ok || !data.id) {
    const reason = data.error?.message || `Drive upload failed: ${uploadResponse.status}`;
    throw new Error(formatDriveUploadError(fileName, caseFolderId, true, reason));
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

function driveViewUrl(fileId: string) {
  return `https://drive.google.com/file/d/${fileId}/view`;
}

function buildDiagnostics(folderPath: string, r2Keys: string[], r2ObjectFound: boolean, googleDriveUploadResult: string) {
  return {
    folderPath,
    r2KeyExists: r2Keys.length > 0,
    r2ObjectFound,
    googleDriveUploadResult,
  };
}

function resolveR2Keys(row: UploadRow) {
  const keys = [safeText(row.r2_key), parseR2KeyFromUrl(row.r2_url)].filter(Boolean);
  return [...new Set(keys)];
}

function parseR2KeyFromUrl(value?: string) {
  const text = safeText(value);
  if (!text) return "";
  try {
    const url = new URL(text, "https://rentflow.local");
    return safeText(url.searchParams.get("key"));
  } catch {
    return "";
  }
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
