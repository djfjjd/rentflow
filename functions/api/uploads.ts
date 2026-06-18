import { ensureColumns, noStoreHeaders, safeText } from "./_d1-utils";

type UploadEnv = {
  DB?: any;
  GOOGLE_APPS_SCRIPT_UPLOAD_URL?: string;
  GOOGLE_APPS_SCRIPT_TOKEN?: string;
  RENTFLOW_UPLOADS?: any; // R2Bucket
};

type UploadContext = {
  request: Request;
  env: UploadEnv;
};

type FileRecord = {
  fileName: string;
  r2Url: string;
  r2Key: string;
  driveBackupStatus: "success" | "failed" | "none";
  driveFileId?: string;
  driveUrl?: string;
  driveFolderId?: string;
  driveFolderUrl?: string;
  vehicleNumber: string;
  insuranceNumber?: string;
  customerName?: string;
  intakeType?: string;
  fileType?: string;
  recordType?: string;
  recordId?: string;
  vehicleFolderUrl?: string;
  insuranceFolderUrl?: string;
  customerFolderUrl?: string;
  uploadedAt: string;
};

export async function onRequestPost({ request, env }: UploadContext) {
  const formData = await request.formData();
  const file = formData.get("file");
  const metadata = parseMetadata(formData.get("metadata"));

  if (!(file instanceof File)) {
    return Response.json({ stored: false, error: "file is required" }, { status: 400, headers: noStoreHeaders() });
  }

  const uploadedAt = new Date().toISOString();
  const fileName = String(metadata.fileName || metadata.storedFileName || file.name);
  
  // 1. Primary Storage: Cloudflare R2
  let r2Key = "";
  let r2Url = "";
  
  if (env.RENTFLOW_UPLOADS) {
    const timestamp = Date.now();
    r2Key = `${metadata.vehicleNumber || "unknown"}/${timestamp}_${fileName}`;
    await env.RENTFLOW_UPLOADS.put(r2Key, await file.arrayBuffer(), {
      httpMetadata: { contentType: file.type || "application/octet-stream" },
    });
    // In production, this would be a custom domain or a proxy route
    r2Url = `/api/uploads?key=${encodeURIComponent(r2Key)}`;
  }

  // 2. Secondary Storage: Google Drive (Backup)
  let driveBackupStatus: "success" | "failed" | "none" = "none";
  let driveResult: Record<string, unknown> = {};

  if (env.GOOGLE_APPS_SCRIPT_UPLOAD_URL) {
    try {
      const payload = {
        action: "upload",
        fileName,
        mimeType: file.type || "application/octet-stream",
        base64: arrayBufferToBase64(await file.arrayBuffer()),
        metadata: {
          ...metadata,
          fileName,
          originalFileName: file.name,
          uploadedAt,
          r2Key,
          r2Url,
        },
      };
      driveResult = await callAppsScript(env, payload);
      driveBackupStatus = "success";
    } catch (error) {
      console.error("Google Drive Backup Failed:", error);
      driveBackupStatus = "failed";
    }
  }

  const record = toFileRecord(r2Key, r2Url, driveBackupStatus, driveResult, metadata);

  return Response.json({
    stored: true,
    ...record,
  }, { headers: noStoreHeaders() });
}

export async function onRequestGet({ request, env }: UploadContext) {
  const url = new URL(request.url);
  const key = url.searchParams.get("key");
  const recordType = url.searchParams.get("recordType");
  const recordId = url.searchParams.get("recordId");
  const vehicleNumber = url.searchParams.get("vehicleNumber");

  // Handle R2 file download/view
  if (key && env.RENTFLOW_UPLOADS) {
    const object = await env.RENTFLOW_UPLOADS.get(key);
    if (!object) return new Response("File not found", { status: 404 });

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    headers.set("Cache-Control", "no-store");
    
    return new Response(object.body, { headers });
  }

  if ((recordType || vehicleNumber) && env.DB) {
    await ensureUploadedFilesSchema(env);
    let results: any[] = [];

    if (recordType && recordId) {
      const response = await env.DB.prepare(
        `SELECT *
         FROM uploaded_files
         WHERE record_type = ? AND record_id = ?
         ORDER BY uploaded_at DESC, created_at DESC`
      ).bind(safeText(recordType), safeText(recordId)).all();
      results = response.results || [];
    }

    if (!results.length && recordType && vehicleNumber) {
      const response = await env.DB.prepare(
        `SELECT *
         FROM uploaded_files
         WHERE record_type = ? AND vehicle_number = ?
         ORDER BY uploaded_at DESC, created_at DESC`
      ).bind(safeText(recordType), safeText(vehicleNumber)).all();
      results = response.results || [];
    }

    if (!results.length && vehicleNumber) {
      const response = await env.DB.prepare(
        `SELECT *
         FROM uploaded_files
         WHERE vehicle_number = ?
         ORDER BY uploaded_at DESC, created_at DESC`
      ).bind(safeText(vehicleNumber)).all();
      results = response.results || [];
    }

    return Response.json(dedupeUploadedRows(results).map(mapUploadedFile), { headers: noStoreHeaders() });
  }

  // Handle listing (from Drive if configured)
  if (!env.GOOGLE_APPS_SCRIPT_UPLOAD_URL) {
    return Response.json({ files: [], fallback: true, message: "GOOGLE_APPS_SCRIPT_UPLOAD_URL is not configured." }, { headers: noStoreHeaders() });
  }

  const query = url.searchParams.get("query") || "";
  try {
    const result = await callAppsScript(env, {
      action: "list",
      query,
    });
    const files = Array.isArray(result.files) ? result.files : [];

    return Response.json({
      files: files.map((file) => toFileRecord("", "", "success", file as Record<string, unknown>, {})),
    }, { headers: noStoreHeaders() });
  } catch (error) {
    return Response.json({ files: [], error: String(error) }, { headers: noStoreHeaders() });
  }
}

function mapUploadedFile(row: any) {
  return {
    id: row.id,
    file_name: row.file_name,
    fileName: row.file_name,
    r2_url: row.r2_url,
    r2Url: row.r2_url,
    r2_key: row.r2_key,
    r2Key: row.r2_key,
    drive_url: row.drive_url,
    driveUrl: row.drive_url,
    mime_type: row.mime_type || row.file_type,
    mimeType: row.mime_type || row.file_type,
    file_type: row.file_type,
    fileType: row.file_type,
    record_type: row.record_type,
    recordType: row.record_type,
    record_id: row.record_id,
    recordId: row.record_id,
    vehicle_number: row.vehicle_number,
    vehicleNumber: row.vehicle_number,
    created_at: row.created_at,
    createdAt: row.created_at,
    uploaded_at: row.uploaded_at,
    uploadedAt: row.uploaded_at,
  };
}

function dedupeUploadedRows(rows: any[]) {
  const seen = new Set<string>();
  const deduped = [];
  for (const row of rows) {
    const key = String(row.id || `${row.r2_key || ""}:${row.file_name || ""}`);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(row);
  }
  return deduped;
}

async function ensureUploadedFilesSchema(env: UploadContext["env"]) {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS uploaded_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_name TEXT NOT NULL,
      r2_url TEXT NOT NULL,
      r2_key TEXT NOT NULL,
      drive_url TEXT,
      vehicle_number TEXT,
      file_type TEXT,
      record_type TEXT,
      record_id TEXT,
      uploaded_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
  await ensureColumns(env.DB, "uploaded_files", [
    { name: "drive_url", definition: "TEXT" },
    { name: "vehicle_number", definition: "TEXT" },
    { name: "file_type", definition: "TEXT" },
    { name: "mime_type", definition: "TEXT" },
    { name: "record_type", definition: "TEXT" },
    { name: "record_id", definition: "TEXT" },
    { name: "created_at", definition: "DATETIME" },
  ]);
}

export async function onRequestDelete({ request, env }: UploadContext) {
  const url = new URL(request.url);
  const key = url.searchParams.get("key");
  const driveFileId = url.searchParams.get("driveFileId");

  if (key && env.RENTFLOW_UPLOADS) {
    await env.RENTFLOW_UPLOADS.delete(key);
  }

  if (driveFileId && env.GOOGLE_APPS_SCRIPT_UPLOAD_URL) {
    try {
      await callAppsScript(env, {
        action: "delete",
        driveFileId,
      });
    } catch (error) {
      console.error("Google Drive Delete Failed:", error);
    }
  }

  return Response.json({ deleted: true }, { headers: noStoreHeaders() });
}

async function callAppsScript(env: UploadEnv, payload: Record<string, unknown>) {
  const response = await fetch(env.GOOGLE_APPS_SCRIPT_UPLOAD_URL || "", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(env.GOOGLE_APPS_SCRIPT_TOKEN ? { authorization: `Bearer ${env.GOOGLE_APPS_SCRIPT_TOKEN}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Google Apps Script request failed: ${response.status}`);
  }

  return (await response.json()) as Record<string, unknown>;
}

function toFileRecord(
  r2Key: string, 
  r2Url: string, 
  driveBackupStatus: "success" | "failed" | "none",
  driveResult: Record<string, unknown>, 
  fallback: Record<string, unknown>
): FileRecord {
  const driveFileId = String(driveResult.driveFileId || driveResult.fileId || driveResult.id || "");
  const driveFolderId = String(driveResult.driveFolderId || driveResult.folderId || "");

  return {
    fileName: String(driveResult.fileName || fallback.fileName || fallback.storedFileName || ""),
    r2Key: r2Key || String(driveResult.r2Key || ""),
    r2Url: r2Url || String(driveResult.r2Url || ""),
    driveBackupStatus: driveBackupStatus === "success" || driveFileId ? "success" : driveBackupStatus,
    driveFileId,
    driveUrl: String(driveResult.driveUrl || driveResult.webViewLink || (driveFileId ? `https://drive.google.com/file/d/${driveFileId}/view` : "")),
    driveFolderId,
    driveFolderUrl: String(driveResult.driveFolderUrl || driveResult.folderUrl || (driveFolderId ? `https://drive.google.com/drive/folders/${driveFolderId}` : "")),
    vehicleNumber: String(driveResult.vehicleNumber || fallback.vehicleNumber || ""),
    insuranceNumber: String(driveResult.insuranceNumber || driveResult.claimNumber || fallback.insuranceNumber || ""),
    customerName: String(driveResult.customerName || fallback.customerName || ""),
    intakeType: String(driveResult.intakeType || fallback.intakeType || ""),
    fileType: String(driveResult.fileType || fallback.fileType || fallback.intakeType || ""),
    recordType: String(driveResult.recordType || fallback.recordType || ""),
    recordId: String(driveResult.recordId || fallback.recordId || ""),
    vehicleFolderUrl: String(driveResult.vehicleFolderUrl || ""),
    insuranceFolderUrl: String(driveResult.insuranceFolderUrl || ""),
    customerFolderUrl: String(driveResult.customerFolderUrl || ""),
    uploadedAt: String(driveResult.uploadedAt || fallback.uploadedAt || new Date().toISOString()),
  };
}

function parseMetadata(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return {};

  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}
