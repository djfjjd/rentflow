import { ensureColumns, noStoreHeaders, safeText } from "./_d1-utils";
import { activePhotoRetentionWhere, cleanupExpiredPhotoCaptures, isActivePhotoCaptureObject } from "./_photo-retention";

type UploadEnv = {
  DB?: any;
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
  thumbnailUrl?: string;
  thumbnailKey?: string;
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
  const thumbnail = formData.get("thumbnail");
  const metadata = parseMetadata(formData.get("metadata"));

  if (!(file instanceof File)) {
    return Response.json({ stored: false, error: "file is required" }, { status: 400, headers: noStoreHeaders() });
  }

  const uploadedAt = new Date().toISOString();
  const fileName = String(metadata.fileName || metadata.storedFileName || file.name);
  
  // 1. Primary Storage: Cloudflare R2
  let r2Key = "";
  let r2Url = "";
  let thumbnailKey = "";
  let thumbnailUrl = "";
  
  if (env.RENTFLOW_UPLOADS) {
    const timestamp = Date.now();
    r2Key = `${metadata.vehicleNumber || "unknown"}/${timestamp}_${fileName}`;
    await env.RENTFLOW_UPLOADS.put(r2Key, await file.arrayBuffer(), {
      httpMetadata: { contentType: file.type || "application/octet-stream", cacheControl: "public,max-age=31536000,immutable" },
    });
    // In production, this would be a custom domain or a proxy route
    r2Url = `/api/uploads?key=${encodeURIComponent(r2Key)}`;

    if (thumbnail instanceof File) {
      thumbnailKey = `${metadata.vehicleNumber || "unknown"}/${timestamp}_${thumbnailFileName(fileName)}`;
      await env.RENTFLOW_UPLOADS.put(thumbnailKey, await thumbnail.arrayBuffer(), {
        httpMetadata: { contentType: "image/webp", cacheControl: "public,max-age=31536000,immutable" },
      });
      thumbnailUrl = `/api/uploads?key=${encodeURIComponent(thumbnailKey)}`;
    }
  }

  let driveBackupStatus: "success" | "failed" | "none" = "none";
  let driveResult: Record<string, unknown> = {};

  const record = toFileRecord(r2Key, r2Url, thumbnailKey, thumbnailUrl, driveBackupStatus, driveResult, metadata);

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
    if (env.DB) {
      await ensureUploadedFilesSchema(env);
      await cleanupExpiredPhotoCaptures(env.DB, env.RENTFLOW_UPLOADS);
      const active = await isActivePhotoCaptureObject(env.DB, key);
      if (!active) {
        await env.RENTFLOW_UPLOADS.delete(key);
        return new Response("File not found", { status: 404, headers: noStoreHeaders() });
      }
    }

    const object = await env.RENTFLOW_UPLOADS.get(key);
    if (!object) return new Response("File not found", { status: 404 });

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    headers.set("Cache-Control", "public,max-age=31536000,immutable");
    
    return new Response(object.body, { headers });
  }

  if ((recordType || vehicleNumber) && env.DB) {
    await ensureUploadedFilesSchema(env);
    await cleanupExpiredPhotoCaptures(env.DB, env.RENTFLOW_UPLOADS);
    let results: any[] = [];

    if (recordType && recordId) {
      const response = await env.DB.prepare(
        `SELECT *
         FROM uploaded_files
         WHERE record_type = ? AND record_id = ?
           AND ${activePhotoRetentionWhere()}
         ORDER BY uploaded_at DESC, created_at DESC`
      ).bind(safeText(recordType), safeText(recordId)).all();
      results = response.results || [];
    }

    if (!results.length && recordType && vehicleNumber) {
      const response = await env.DB.prepare(
        `SELECT *
         FROM uploaded_files
         WHERE record_type = ? AND vehicle_number = ?
           AND ${activePhotoRetentionWhere()}
         ORDER BY uploaded_at DESC, created_at DESC`
      ).bind(safeText(recordType), safeText(vehicleNumber)).all();
      results = response.results || [];
    }

    if (!results.length && vehicleNumber) {
      const response = await env.DB.prepare(
        `SELECT *
         FROM uploaded_files
         WHERE vehicle_number = ?
           AND ${activePhotoRetentionWhere()}
         ORDER BY uploaded_at DESC, created_at DESC`
      ).bind(safeText(vehicleNumber)).all();
      results = response.results || [];
    }

    return Response.json(dedupeUploadedRows(results).map(mapUploadedFile), { headers: noStoreHeaders() });
  }

  return Response.json({ files: [], fallback: true, message: "Drive listing is handled by uploaded_files." }, { headers: noStoreHeaders() });
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
    thumbnail_url: row.thumbnail_url,
    thumbnailUrl: row.thumbnail_url,
    thumbnail_key: row.thumbnail_key,
    thumbnailKey: row.thumbnail_key,
    drive_url: row.drive_url,
    driveUrl: row.drive_url,
    drive_file_id: row.drive_file_id,
    driveFileId: row.drive_file_id,
    archived_at: row.archived_at,
    archivedAt: row.archived_at,
    archive_status: row.archive_status || "none",
    archiveStatus: row.archive_status || "none",
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
    { name: "uploaded_at", definition: "DATETIME" },
    { name: "created_at", definition: "DATETIME" },
    { name: "thumbnail_url", definition: "TEXT" },
    { name: "thumbnail_key", definition: "TEXT" },
    { name: "drive_file_id", definition: "TEXT" },
    { name: "drive_url", definition: "TEXT" },
    { name: "archived_at", definition: "DATETIME" },
    { name: "archive_status", definition: "TEXT DEFAULT 'none'" },
  ]);
}

export async function onRequestDelete({ request, env }: UploadContext) {
  const url = new URL(request.url);
  const key = url.searchParams.get("key");

  if (key && env.RENTFLOW_UPLOADS) {
    await env.RENTFLOW_UPLOADS.delete(key);
  }

  return Response.json({ deleted: true }, { headers: noStoreHeaders() });
}

function toFileRecord(
  r2Key: string, 
  r2Url: string, 
  thumbnailKey: string,
  thumbnailUrl: string,
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
    thumbnailKey: thumbnailKey || String(driveResult.thumbnailKey || fallback.thumbnailKey || ""),
    thumbnailUrl: thumbnailUrl || String(driveResult.thumbnailUrl || fallback.thumbnailUrl || ""),
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

function thumbnailFileName(fileName: string) {
  const dotIndex = fileName.lastIndexOf(".");
  const baseName = dotIndex > 0 ? fileName.slice(0, dotIndex) : fileName;
  return `${baseName}_thumb.webp`;
}

function parseMetadata(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return {};

  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return {};
  }
}
