import { noStoreHeaders, safeText } from "../_d1-utils";
import { activePhotoRetentionWhere, cleanupExpiredPhotoCaptures, isActivePhotoCaptureObject } from "../_photo-retention";
import { getApiSession, isStaff } from "../_permissions";

type Env = {
  DB?: any;
  RENTFLOW_UPLOADS?: any;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_REFRESH_TOKEN?: string;
  JWT_SECRET?: string;
};

type UploadedFileRow = {
  id?: number;
  file_name?: string;
  r2_key?: string;
  drive_file_id?: string;
  mime_type?: string;
  file_type?: string;
};

export async function onRequestGet({ request, env }: { request: Request; env: Env }) {
  try {
    const url = new URL(request.url);
    const id = safeText(url.searchParams.get("id")).trim();
    const key = safeText(url.searchParams.get("key")).trim();
    const fileId = safeText(url.searchParams.get("fileId")).trim();

    if (!id && !key && !fileId) {
      return new Response("Missing photo id, key, or fileId", { status: 400, headers: noStoreHeaders() });
    }

    const row = env.DB ? await findUploadedFile(env, { id, key, fileId }) : null;
    const r2Key = safeText(row?.r2_key || key).trim();
    const driveFileId = safeText(row?.drive_file_id || fileId).trim();
    const filename = safeFileName(row?.file_name || fileNameFromKey(r2Key) || (driveFileId ? `photo-${driveFileId}` : "photo"));
    const contentType = safeText(row?.mime_type || row?.file_type).trim();

    if (r2Key && env.RENTFLOW_UPLOADS) {
      if (env.DB) {
        const active = row || await isActivePhotoCaptureObject(env.DB, r2Key);
        if (!active) {
          await env.RENTFLOW_UPLOADS.delete(r2Key);
          return new Response("File not found", { status: 404, headers: noStoreHeaders() });
        }
      }

      const object = await env.RENTFLOW_UPLOADS.get(r2Key);
      if (object) {
        return new Response(object.body, {
          headers: downloadHeaders({
            contentType: object.httpMetadata?.contentType || contentType || "application/octet-stream",
            filename,
          }),
        });
      }
    }

    if (driveFileId) {
      const session = await getApiSession(request, env);
      if (!session || isStaff(session)) {
        return new Response("Forbidden", { status: 403, headers: noStoreHeaders() });
      }
      return await downloadDriveFile(env, driveFileId, filename, contentType);
    }

    return new Response("File not found", { status: 404, headers: noStoreHeaders() });
  } catch (error) {
    console.error("photo download failed", { error: error instanceof Error ? error.message : String(error) });
    return new Response("Photo download failed", { status: 500, headers: noStoreHeaders() });
  }
}

async function findUploadedFile(env: Env, { id, key, fileId }: { id: string; key: string; fileId: string }) {
  if (!env.DB) return null;
  await cleanupExpiredPhotoCaptures(env.DB, env.RENTFLOW_UPLOADS);

  if (id) {
    return await env.DB.prepare(`
      SELECT *
      FROM uploaded_files
      WHERE id = ?
        AND ${activePhotoRetentionWhere()}
      LIMIT 1
    `).bind(id).first() as UploadedFileRow | null;
  }

  if (key) {
    return await env.DB.prepare(`
      SELECT *
      FROM uploaded_files
      WHERE r2_key = ?
        AND ${activePhotoRetentionWhere()}
      LIMIT 1
    `).bind(key).first() as UploadedFileRow | null;
  }

  if (fileId) {
    return await env.DB.prepare(`
      SELECT *
      FROM uploaded_files
      WHERE drive_file_id = ?
        AND ${activePhotoRetentionWhere()}
      LIMIT 1
    `).bind(fileId).first() as UploadedFileRow | null;
  }

  return null;
}

async function downloadDriveFile(env: Env, fileId: string, fallbackName: string, fallbackContentType: string) {
  const token = await getGoogleAccessToken(env);
  const metadata = await fetchDriveMetadata(token, fileId);
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok || !response.body) {
    const message = await readGoogleError(response, `Drive download failed: ${response.status}`);
    return new Response(message, { status: response.status || 502, headers: noStoreHeaders() });
  }

  return new Response(response.body, {
    headers: downloadHeaders({
      contentType: response.headers.get("content-type") || metadata.mimeType || fallbackContentType || "application/octet-stream",
      filename: safeFileName(metadata.name || fallbackName),
    }),
  });
}

async function fetchDriveMetadata(token: string, fileId: string) {
  const url = new URL(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`);
  url.searchParams.set("fields", "name,mimeType");
  url.searchParams.set("supportsAllDrives", "true");
  const response = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
  const data = await readGoogleJson(response, "Drive metadata failed") as { name?: string; mimeType?: string; error?: { message?: string } };
  if (!response.ok) throw new Error(data.error?.message || `Drive metadata failed: ${response.status}`);
  return data;
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
  const data = await readGoogleJson(response, "Google token failed") as { access_token?: string; error?: string; error_description?: string };
  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || `Google token failed: ${response.status}`);
  }
  return data.access_token;
}

function downloadHeaders({ contentType, filename }: { contentType: string; filename: string }) {
  const headers = new Headers(noStoreHeaders());
  headers.set("Content-Type", contentType || "application/octet-stream");
  headers.set("Content-Disposition", contentDisposition(filename));
  headers.set("Cache-Control", "private, max-age=0, no-store");
  return headers;
}

function contentDisposition(filename: string) {
  const quoted = filename.replace(/["\\]/g, "_");
  return `attachment; filename="${quoted}"; filename*=UTF-8''${encodeRFC5987ValueChars(filename)}`;
}

function safeFileName(value: string) {
  const cleaned = safeText(value).replace(/[\r\n]/g, " ").replace(/[/:*?"<>|\\]/g, "_").trim();
  return cleaned || "photo";
}

function fileNameFromKey(key: string) {
  const last = key.split("/").pop() || "";
  return last.replace(/^\d+_/, "");
}

function encodeRFC5987ValueChars(value: string) {
  return encodeURIComponent(value).replace(/['()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

async function readGoogleJson(response: Response, label: string) {
  const contentType = response.headers.get("content-type") || "";
  const text = await response.text();
  if (!contentType.includes("application/json")) {
    throw new Error(`${label}: Drive API returned non-JSON response: ${text.slice(0, 120) || response.status}`);
  }
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
