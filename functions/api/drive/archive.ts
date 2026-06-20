import { ensureColumns, noStoreHeaders, safeText } from "../_d1-utils";

type Env = {
  DB: any;
  RENTFLOW_UPLOADS?: any;
  GOOGLE_APPS_SCRIPT_UPLOAD_URL?: string;
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

type AppsScriptUploadResult = {
  status?: string;
  driveFileId?: string;
  fileId?: string;
  id?: string;
  driveUrl?: string;
  url?: string;
  webViewLink?: string;
  error?: string;
  message?: string;
};

export async function onRequestPost({ request, env }: { request: Request; env: Env }) {
  try {
    if (!env.DB || !env.RENTFLOW_UPLOADS) {
      return Response.json({ error: "DB or R2 is not configured" }, { status: 500, headers: noStoreHeaders() });
    }
    const uploadUrl = safeText(env.GOOGLE_APPS_SCRIPT_UPLOAD_URL).trim();
    if (!uploadUrl) {
      return Response.json({ error: "GOOGLE_APPS_SCRIPT_UPLOAD_URL is not configured" }, { status: 500, headers: noStoreHeaders() });
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
      try {
        const object = await getR2Object(env, r2Keys);
        r2ObjectFound = Boolean(object);
        if (!object) {
          r2Missing += 1;
          throw new Error("R2 file not found");
        }

        const bytes = await object.arrayBuffer();
        const mimeType = row.mime_type || object.httpMetadata?.contentType || "application/octet-stream";
        const result = await uploadToAppsScript(uploadUrl, {
          folderPath,
          fileName,
          mimeType,
          base64: arrayBufferToBase64(bytes),
        });
        const status = safeText(result.status).toLowerCase();
        const driveFileId = safeText(result.driveFileId || result.fileId || result.id);
        const driveUrl = safeText(result.driveUrl || result.url || result.webViewLink);

        if (status === "skipped") {
          await updateArchiveRow(env, row.id, driveFileId, driveUrl, "archived");
          skipped += 1;
          itemResults.push({ id: row.id, fileName, status: "skipped", reason: "already_exists", diagnostics: buildDiagnostics(folderPath, r2Keys, r2ObjectFound, "skipped"), driveFileId, driveUrl });
          continue;
        }

        if (status !== "uploaded") {
          throw new Error(result.error || result.message || `Unexpected Apps Script status: ${result.status || "empty"}`);
        }

        await updateArchiveRow(env, row.id, driveFileId, driveUrl, "archived");
        uploaded += 1;
        itemResults.push({ id: row.id, fileName, status: "uploaded", diagnostics: buildDiagnostics(folderPath, r2Keys, r2ObjectFound, "uploaded"), driveFileId, driveUrl });
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

async function uploadToAppsScript(uploadUrl: string, body: { folderPath: string; fileName: string; mimeType: string; base64: string }) {
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let data: AppsScriptUploadResult = {};
  try {
    data = text ? JSON.parse(text) as AppsScriptUploadResult : {};
  } catch {
    data = { error: text };
  }
  if (!response.ok) {
    throw new Error(data.error || data.message || `Apps Script upload failed: ${response.status}`);
  }
  return data;
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
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
