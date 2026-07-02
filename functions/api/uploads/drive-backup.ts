import { ensureColumns, noStoreHeaders, safeNullableText, safeText } from "../_d1-utils";
import { requirePermission } from "../_permissions";

type Env = {
  DB: any;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_REFRESH_TOKEN?: string;
  GOOGLE_DRIVE_FOLDER_ID?: string;
  JWT_SECRET?: string;
};

const FOLDER_MIME = "application/vnd.google-apps.folder";

export async function onRequestPost({ request, env }: { request: Request; env: Env }) {
  const auth = await requirePermission(request, env, "photos.upload");
  if (auth.response) return auth.response;
  await ensureUploadedFilesDriveSchema(env);
  const formData = await request.formData();
  const file = formData.get("file");
  const id = safeText(formData.get("id")).trim();
  const metadata = parseMetadata(formData.get("metadata"));
  if (!(file instanceof File) || !id) {
    return Response.json({ success: false, error: "id and file are required" }, { status: 400, headers: noStoreHeaders() });
  }

  await env.DB.prepare("UPDATE uploaded_files SET drive_backup_status = 'uploading', drive_error_message = NULL WHERE id = ?").bind(id).run();

  try {
    const rootFolderId = safeText(env.GOOGLE_DRIVE_FOLDER_ID).trim();
    if (!rootFolderId) throw new Error("GOOGLE_DRIVE_FOLDER_ID is not configured");
    const row = await env.DB.prepare("SELECT * FROM uploaded_files WHERE id = ? LIMIT 1").bind(id).first() as Record<string, unknown> | null;
    if (!row) throw new Error("photo metadata not found");
    const uploadedAt = new Date().toISOString();
    const recordType = safeText(row.record_type || metadata.recordType || "unknown");
    const recordId = safeText(row.record_id || metadata.recordId || id);
    const vehicleNumber = safeText(row.vehicle_number || metadata.vehicleNumber || "unknown");
    const token = await getGoogleAccessToken(env);
    const photoRootId = await getOrCreateFolder(token, rootFolderId, "사진원본");
    const monthFolderId = await getOrCreateFolder(token, photoRootId, uploadedAt.slice(0, 7));
    const caseFolderId = await getOrCreateFolder(token, monthFolderId, sanitizeDriveName(`${recordType}_${recordId}_${vehicleNumber}`));
    const driveFile = await uploadDriveFile(token, caseFolderId, buildOriginalDriveFileName(file, recordType, recordId), file);
    const driveView = driveFile.webViewLink || driveViewUrl(driveFile.id);
    const driveDownload = driveDownloadUrl(driveFile.id);
    await env.DB.prepare(`
      UPDATE uploaded_files
      SET drive_backup_status = 'completed',
          drive_file_id = ?,
          drive_url = ?,
          google_drive_file_id = ?,
          google_drive_view_url = ?,
          google_drive_download_url = ?,
          drive_folder_id = ?,
          drive_folder_url = ?,
          drive_uploaded_at = ?,
          drive_error_message = NULL,
          archived_at = ?,
          archive_status = 'archived'
      WHERE id = ?
    `).bind(
      driveFile.id,
      driveView,
      driveFile.id,
      driveView,
      driveDownload,
      caseFolderId,
      driveFolderUrl(caseFolderId),
      uploadedAt,
      uploadedAt,
      id,
    ).run();
    return Response.json({ success: true, id, driveFileId: driveFile.id, driveViewUrl: driveView, googleDriveViewUrl: driveView, driveUploadedAt: uploadedAt }, { headers: noStoreHeaders() });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await env.DB.prepare("UPDATE uploaded_files SET drive_backup_status = 'failed', drive_error_message = ? WHERE id = ?").bind(message, id).run();
    return Response.json({ success: false, id, error: message }, { status: 500, headers: noStoreHeaders() });
  }
}

export async function onRequestPatch({ request, env }: { request: Request; env: Env }) {
  const auth = await requirePermission(request, env, "photos.upload");
  if (auth.response) return auth.response;
  await ensureUploadedFilesDriveSchema(env);
  const body = await request.json().catch(() => ({})) as { ids?: unknown[]; status?: string; message?: string };
  const status = safeText(body.status);
  if (status !== "canceled" || !Array.isArray(body.ids)) {
    return Response.json({ error: "ids and status=canceled are required" }, { status: 400, headers: noStoreHeaders() });
  }
  const ids = body.ids.map((id) => safeText(id)).filter(Boolean);
  for (const id of ids) {
    await env.DB.prepare("UPDATE uploaded_files SET drive_backup_status = 'canceled', drive_error_message = ? WHERE id = ? AND drive_backup_status IN ('pending', 'uploading')").bind(safeNullableText(body.message || "업로드 중단됨"), id).run();
  }
  return Response.json({ success: true, canceled: ids.length }, { headers: noStoreHeaders() });
}

async function ensureUploadedFilesDriveSchema(env: Env) {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS uploaded_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_name TEXT NOT NULL,
      r2_url TEXT NOT NULL,
      r2_key TEXT NOT NULL,
      uploaded_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
  await ensureColumns(env.DB, "uploaded_files", [
    { name: "drive_backup_status", definition: "TEXT" },
    { name: "drive_file_id", definition: "TEXT" },
    { name: "drive_url", definition: "TEXT" },
    { name: "google_drive_file_id", definition: "TEXT" },
    { name: "google_drive_view_url", definition: "TEXT" },
    { name: "google_drive_download_url", definition: "TEXT" },
    { name: "drive_folder_id", definition: "TEXT" },
    { name: "drive_folder_url", definition: "TEXT" },
    { name: "drive_uploaded_at", definition: "DATETIME" },
    { name: "drive_error_message", definition: "TEXT" },
    { name: "archived_at", definition: "DATETIME" },
    { name: "archive_status", definition: "TEXT DEFAULT 'none'" },
    { name: "record_type", definition: "TEXT" },
    { name: "record_id", definition: "TEXT" },
    { name: "vehicle_number", definition: "TEXT" },
  ]);
}

async function getGoogleAccessToken(env: Env) {
  const clientId = safeText(env.GOOGLE_CLIENT_ID).trim();
  const clientSecret = safeText(env.GOOGLE_CLIENT_SECRET).trim();
  const refreshToken = safeText(env.GOOGLE_REFRESH_TOKEN).trim();
  if (!clientId || !clientSecret || !refreshToken) throw new Error("Google OAuth credentials are not configured");
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: "refresh_token" }),
  });
  const data = await readGoogleJson(response, "Google token failed") as { access_token?: string; error?: string; error_description?: string };
  if (!response.ok || !data.access_token) throw new Error(data.error_description || data.error || `Google token failed: ${response.status}`);
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
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name: folderName, mimeType: FOLDER_MIME, parents: [parentFolderId] }),
  });
  const data = await readGoogleJson(response, "Drive folder create failed") as { id?: string; error?: { message?: string } };
  if (!response.ok || !data.id) throw new Error(data.error?.message || `Drive folder create failed: ${response.status}`);
  return data.id;
}

async function findDriveFolder(token: string, parentId: string, name: string) {
  const query = [`'${escapeDriveQuery(parentId)}' in parents`, `name='${escapeDriveQuery(name)}'`, "trashed=false", `mimeType='${FOLDER_MIME}'`].join(" and ");
  const url = new URL("https://www.googleapis.com/drive/v3/files");
  url.searchParams.set("q", query);
  url.searchParams.set("fields", "files(id,name,webViewLink)");
  url.searchParams.set("pageSize", "1");
  url.searchParams.set("supportsAllDrives", "true");
  url.searchParams.set("includeItemsFromAllDrives", "true");
  const response = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
  const data = await readGoogleJson(response, "Drive search failed") as { files?: { id: string; name: string; webViewLink?: string }[]; error?: { message?: string } };
  if (!response.ok) throw new Error(data.error?.message || `Drive search failed: ${response.status}`);
  return data.files?.[0] || null;
}

async function uploadDriveFile(token: string, folderId: string, fileName: string, file: File) {
  const bytes = await file.arrayBuffer();
  const safeMimeType = file.type || "application/octet-stream";
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
      "X-Upload-Content-Length": String(bytes.byteLength),
    },
    body: JSON.stringify({ name: fileName, parents: [folderId] }),
  });
  if (!initResponse.ok) throw new Error(await readGoogleError(initResponse, `Drive upload session failed: ${initResponse.status}`));
  const uploadUrl = initResponse.headers.get("Location");
  if (!uploadUrl) throw new Error("Drive upload session location is missing");
  const uploadResponse = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": safeMimeType, "Content-Length": String(bytes.byteLength) }, body: bytes });
  const data = await readGoogleJson(uploadResponse, "Drive upload failed") as { id?: string; webViewLink?: string; error?: { message?: string } };
  if (!uploadResponse.ok || !data.id) throw new Error(data.error?.message || `Drive upload failed: ${uploadResponse.status}`);
  return { id: data.id, webViewLink: data.webViewLink };
}

function buildOriginalDriveFileName(file: File, recordType: string, recordId: string) {
  const extension = file.name.includes(".") ? file.name.split(".").pop() || "jpg" : "jpg";
  return `${Date.now()}_${sanitizeDriveName(recordType)}_${sanitizeDriveName(recordId)}.${extension.toLowerCase()}`;
}

function driveViewUrl(fileId: string) {
  return `https://drive.google.com/file/d/${fileId}/view`;
}

function driveDownloadUrl(fileId: string) {
  return `https://drive.google.com/uc?id=${encodeURIComponent(fileId)}&export=download`;
}

function driveFolderUrl(folderId: string) {
  return `https://drive.google.com/drive/folders/${folderId}`;
}

function sanitizeDriveName(value: string) {
  return safeText(value).replace(/[\\/:*?"<>|#%{}~&]/g, "_").replace(/\s+/g, " ").trim().slice(0, 120) || "unknown";
}

async function readGoogleJson(response: Response, label: string) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${label}: Drive API JSON parse failed: ${text.slice(0, 120) || response.status}`);
  }
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

function escapeDriveQuery(value: string) {
  return safeText(value).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function parseMetadata(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return {};
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return {};
  }
}
