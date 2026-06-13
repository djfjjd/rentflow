type UploadEnv = {
  GOOGLE_APPS_SCRIPT_UPLOAD_URL?: string;
  GOOGLE_APPS_SCRIPT_TOKEN?: string;
};

type UploadContext = {
  request: Request;
  env: UploadEnv;
};

type DriveFileRecord = {
  fileName: string;
  driveFileId: string;
  driveUrl: string;
  driveFolderId: string;
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

  if (!env.GOOGLE_APPS_SCRIPT_UPLOAD_URL) {
    return Response.json({ stored: false, error: "GOOGLE_APPS_SCRIPT_UPLOAD_URL is not configured." }, { status: 500 });
  }

  const uploadedAt = new Date().toISOString();
  const fileName = String(metadata.fileName || metadata.storedFileName || file.name);
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
    },
  };
  let driveResult: Record<string, unknown>;

  try {
    driveResult = await callAppsScript(env, payload);
  } catch (error) {
    return Response.json(
      {
        stored: false,
        error: error instanceof Error ? error.message : "Google Drive upload failed.",
      },
      { status: 502 },
    );
  }

  const record = toDriveFileRecord(driveResult, payload.metadata);

  return Response.json({
    stored: true,
    ...record,
  });
}

export async function onRequestGet({ request, env }: UploadContext) {
  if (!env.GOOGLE_APPS_SCRIPT_UPLOAD_URL) {
    return Response.json({ files: [], fallback: true, message: "GOOGLE_APPS_SCRIPT_UPLOAD_URL is not configured." });
  }

  const url = new URL(request.url);
  const query = url.searchParams.get("query") || "";
  const result = await callAppsScript(env, {
    action: "list",
    query,
  });
  const files = Array.isArray(result.files) ? result.files : [];

  return Response.json({
    files: files.map((file) => toDriveFileRecord(file as Record<string, unknown>, {})),
  });
}

export async function onRequestDelete({ request, env }: UploadContext) {
  if (!env.GOOGLE_APPS_SCRIPT_UPLOAD_URL) {
    return Response.json({ deleted: false, error: "GOOGLE_APPS_SCRIPT_UPLOAD_URL is not configured." }, { status: 500 });
  }

  const url = new URL(request.url);
  const driveFileId = url.searchParams.get("driveFileId");

  if (!driveFileId) {
    return Response.json({ deleted: false, error: "driveFileId is required" }, { status: 400 });
  }

  await callAppsScript(env, {
    action: "delete",
    driveFileId,
  });

  return Response.json({ deleted: true, driveFileId });
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

function toDriveFileRecord(result: Record<string, unknown>, fallback: Record<string, unknown>): DriveFileRecord {
  const driveFileId = String(result.driveFileId || result.fileId || result.id || "");
  const driveFolderId = String(result.driveFolderId || result.folderId || "");

  return {
    fileName: String(result.fileName || fallback.fileName || ""),
    driveFileId,
    driveUrl: String(result.driveUrl || result.webViewLink || (driveFileId ? `https://drive.google.com/file/d/${driveFileId}/view` : "")),
    driveFolderId,
    driveFolderUrl: String(result.driveFolderUrl || result.folderUrl || (driveFolderId ? `https://drive.google.com/drive/folders/${driveFolderId}` : "")),
    vehicleNumber: String(result.vehicleNumber || fallback.vehicleNumber || ""),
    insuranceNumber: String(result.insuranceNumber || result.claimNumber || fallback.insuranceNumber || ""),
    customerName: String(result.customerName || fallback.customerName || ""),
    vehicleFolderUrl: String(result.vehicleFolderUrl || ""),
    insuranceFolderUrl: String(result.insuranceFolderUrl || ""),
    customerFolderUrl: String(result.customerFolderUrl || ""),
    uploadedAt: String(result.uploadedAt || fallback.uploadedAt || new Date().toISOString()),
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
