import {
  buildDriveFileName,
  buildDriveFolderPath,
  getFileExtension,
  type DriveBusinessFolder,
  type DriveFileKind,
} from "@/lib/google-drive";

export type UploadFileMetadata = {
  vehicleNumber: string;
  claimNumber?: string;
  insuranceNumber?: string;
  businessFolder: DriveBusinessFolder;
  fileKind: DriveFileKind;
  uploadedBy?: string;
  intakeType?: "insurance" | "selfPay" | "selfService";
  orderer?: string;
  repairShop?: string;
  customerCar?: string;
  customerName?: string;
  customerPhone?: string;
  driverLicenseInfo?: string;
  ocrTargets?: string[];
  parkingZone?: string;
  memo?: string;
};

export type StoredFileMetadata = {
  fileName: string;
  r2Url: string;
  r2Key: string;
  driveBackupStatus: "success" | "failed" | "none";
  driveFileId: string;
  driveUrl: string;
  driveFolderId: string;
  driveFolderUrl?: string;
  vehicleNumber: string;
  insuranceNumber?: string;
  customerName?: string;
  intakeType?: "insurance" | "selfPay" | "selfService";
  vehicleFolderUrl?: string;
  insuranceFolderUrl?: string;
  customerFolderUrl?: string;
  uploadedAt: string;
  supabasePayload: {
    fileName: string;
    r2Url: string;
    r2Key: string;
    driveFileId: string;
    driveUrl: string;
    driveFolderId: string;
    vehicleNumber: string;
    insuranceNumber?: string;
    customerName?: string;
    uploadedAt: string;
  };
};

type DriveUploadResponse = Omit<StoredFileMetadata, "supabasePayload"> & {
  stored: boolean;
  error?: string;
};

export async function uploadFilesToDrive(files: File[], metadata: UploadFileMetadata): Promise<StoredFileMetadata[]> {
  return Promise.all(
    files.map(async (file, index) => {
      const uploadedAt = new Date();
      const fileName = buildDriveFileName({
        date: uploadedAt,
        vehicleNumber: metadata.vehicleNumber,
        claimNumber: metadata.insuranceNumber || metadata.claimNumber,
        fileKind: metadata.fileKind,
        sequence: index + 1,
        extension: getFileExtension(file.name, file.type),
      });

      const result = await uploadFileToDrive(file, {
        ...metadata,
        insuranceNumber: metadata.insuranceNumber || metadata.claimNumber,
        fileName,
        folderPath: buildDriveFolderPath(uploadedAt, metadata.vehicleNumber, metadata.businessFolder),
        uploadedAt: uploadedAt.toISOString(),
      });

      return toStoredFileMetadata(result);
    }),
  );
}

function toStoredFileMetadata(result: DriveUploadResponse): StoredFileMetadata {
  return {
    fileName: result.fileName,
    r2Url: result.r2Url,
    r2Key: result.r2Key,
    driveBackupStatus: result.driveBackupStatus,
    driveFileId: result.driveFileId,
    driveUrl: result.driveUrl,
    driveFolderId: result.driveFolderId,
    driveFolderUrl: result.driveFolderUrl,
    vehicleNumber: result.vehicleNumber,
    insuranceNumber: result.insuranceNumber,
    customerName: result.customerName,
    intakeType: result.intakeType,
    vehicleFolderUrl: result.vehicleFolderUrl,
    insuranceFolderUrl: result.insuranceFolderUrl,
    customerFolderUrl: result.customerFolderUrl,
    uploadedAt: result.uploadedAt,
    supabasePayload: {
      fileName: result.fileName,
      r2Url: result.r2Url,
      r2Key: result.r2Key,
      driveFileId: result.driveFileId,
      driveUrl: result.driveUrl,
      driveFolderId: result.driveFolderId,
      vehicleNumber: result.vehicleNumber,
      insuranceNumber: result.insuranceNumber,
      customerName: result.customerName,
      uploadedAt: result.uploadedAt,
    },
  };
}

async function uploadFileToDrive(
  file: File,
  metadata: UploadFileMetadata & { fileName: string; folderPath: string; uploadedAt: string },
): Promise<DriveUploadResponse> {
  const formData = new FormData();

  formData.append("file", file);
  formData.append(
    "metadata",
    JSON.stringify({
      ...metadata,
      fileName: metadata.fileName,
      originalFileName: file.name,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
    }),
  );

  const response = await fetch("/api/uploads", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorMessage = await readUploadError(response);
    throw new Error(errorMessage || `Google Drive upload failed: ${response.status}`);
  }

  return (await response.json()) as DriveUploadResponse;
}

async function readUploadError(response: Response): Promise<string> {
  try {
    const data: unknown = await response.json();

    if (
      typeof data === "object" &&
      data !== null &&
      "error" in data &&
      typeof (data as { error?: unknown }).error === "string"
    ) {
      return (data as { error: string }).error;
    }

    if (
      typeof data === "object" &&
      data !== null &&
      "message" in data &&
      typeof (data as { message?: unknown }).message === "string"
    ) {
      return (data as { message: string }).message;
    }
  } catch {
    return response.statusText;
  }

  return response.statusText;
}