type UploadEnv = {
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
    return Response.json({ stored: false, error: "file is required" }, { status: 400 });
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
  });
}

export async function onRequestGet({ request, env }: UploadContext) {
  const url = new URL(request.url);
  const key = url.searchParams.get("key");

  // Handle R2 file download/view
  if (key && env.RENTFLOW_UPLOADS) {
    const object = await env.RENTFLOW_UPLOADS.get(key);
    if (!object) return new Response("File not found", { status: 404 });

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    
    return new Response(object.body, { headers });
  }

  // Handle listing (from Drive if configured)
  if (!env.GOOGLE_APPS_SCRIPT_UPLOAD_URL) {
    return Response.json({ files: [], fallback: true, message: "GOOGLE_APPS_SCRIPT_UPLOAD_URL is not configured." });
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
    });
  } catch (error) {
    return Response.json({ files: [], error: String(error) });
  }
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

  return Response.json({ deleted: true });
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
