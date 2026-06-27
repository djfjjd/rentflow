import { ensureColumns, noStoreHeaders, safeNullableText, safeText } from "./_d1-utils";

type Env = {
  DB: any;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_REFRESH_TOKEN?: string;
  GOOGLE_DRIVE_FOLDER_ID?: string;
};

const FOLDER_MIME = "application/vnd.google-apps.folder";

export async function onRequestPost({ request, env }: { request: Request; env: Env }) {
  try {
    if (!env.DB) return Response.json({ error: "DB is not configured" }, { status: 500, headers: noStoreHeaders() });
    const rootFolderId = safeText(env.GOOGLE_DRIVE_FOLDER_ID).trim();
    if (!rootFolderId) return Response.json({ error: "GOOGLE_DRIVE_FOLDER_ID is not configured" }, { status: 500, headers: noStoreHeaders() });

    const formData = await request.formData();
    const file = formData.get("file");
    const metadata = parseMetadata(formData.get("metadata"));
    const vehicleId = safeText(metadata.vehicleId);
    const vehicleNumber = sanitizeDriveName(safeText(metadata.vehicleNumber) || "unknown");
    if (!vehicleId || !(file instanceof File)) {
      return Response.json({ error: "vehicleId and file are required" }, { status: 400, headers: noStoreHeaders() });
    }

    await ensureVehicleRegistrationColumns(env);

    const accessToken = await getGoogleAccessToken(env);
    const uploadedAt = new Date().toISOString();
    const registrationFolderId = await getOrCreateFolder(accessToken, rootFolderId, "자동차등록증");
    const monthFolderId = await getOrCreateFolder(accessToken, registrationFolderId, uploadedAt.slice(0, 7));
    const vehicleFolderId = await getOrCreateFolder(accessToken, monthFolderId, sanitizeDriveName(vehicleId));
    const fileName = buildRegistrationFileName(file, vehicleNumber, uploadedAt);
    const driveFile = await uploadDriveFile(accessToken, vehicleFolderId, fileName, file);
    const registrationFileUrl = driveFile.webViewLink || driveViewUrl(driveFile.id);

    await env.DB.prepare(`
      UPDATE vehicles SET
        registration_file_url = ?,
        registration_drive_file_id = ?,
        registration_file_name = ?,
        registration_uploaded_at = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      safeNullableText(registrationFileUrl),
      safeNullableText(driveFile.id),
      safeNullableText(fileName),
      uploadedAt,
      vehicleId,
    ).run();

    return Response.json({
      success: true,
      recordType: "vehicleRegistration",
      vehicleId,
      registrationFileUrl,
      registrationDriveFileId: driveFile.id,
      registrationFileName: fileName,
      registrationUploadedAt: uploadedAt,
    }, { headers: noStoreHeaders() });
  } catch (error) {
    console.error("vehicle registration drive upload failed", { error: error instanceof Error ? error.message : String(error) });
    return Response.json({ error: String(error) }, { status: 500, headers: noStoreHeaders() });
  }
}

async function ensureVehicleRegistrationColumns(env: Env) {
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS vehicles (id TEXT PRIMARY KEY, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)").run();
  await ensureColumns(env.DB, "vehicles", [
    { name: "registration_file_url", definition: "TEXT" },
    { name: "registration_drive_file_id", definition: "TEXT" },
    { name: "registration_file_name", definition: "TEXT" },
    { name: "registration_uploaded_at", definition: "TEXT" },
    { name: "updated_at", definition: "DATETIME" },
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
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
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
  const data = await readGoogleJson(response, "Drive folder create failed") as { id?: string; error?: { message?: string } };
  if (!response.ok || !data.id) throw new Error(data.error?.message || `Drive folder create failed: ${response.status}`);
  return data.id;
}

async function findDriveFolder(token: string, parentId: string, name: string) {
  const query = [
    `'${escapeDriveQuery(parentId)}' in parents`,
    `name='${escapeDriveQuery(name)}'`,
    "trashed=false",
    `mimeType='${FOLDER_MIME}'`,
  ].join(" and ");
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
  const safeMimeType = file.type || "application/octet-stream";
  const bytes = await file.arrayBuffer();
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
  const uploadResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": safeMimeType,
      "Content-Length": String(bytes.byteLength),
    },
    body: bytes,
  });
  const data = await readGoogleJson(uploadResponse, "Drive upload failed") as { id?: string; name?: string; webViewLink?: string; error?: { message?: string } };
  if (!uploadResponse.ok || !data.id) throw new Error(data.error?.message || `Drive upload failed: ${uploadResponse.status}`);
  return { id: data.id, webViewLink: data.webViewLink };
}

function buildRegistrationFileName(file: File, vehicleNumber: string, uploadedAt: string) {
  const extension = file.name.includes(".") ? file.name.split(".").pop() || "jpg" : "jpg";
  const date = new Date(uploadedAt);
  const timestamp = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
    "_",
    String(date.getHours()).padStart(2, "0"),
    String(date.getMinutes()).padStart(2, "0"),
  ].join("");
  return `${vehicleNumber}_자동차등록증_${timestamp}.${extension.toLowerCase()}`;
}

function sanitizeDriveName(value: string) {
  return safeText(value).replace(/[\\/:*?"<>|#%{}~&]/g, "_").replace(/\s+/g, " ").trim().slice(0, 120) || "unknown";
}

function driveViewUrl(fileId: string) {
  return `https://drive.google.com/file/d/${fileId}/view`;
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
