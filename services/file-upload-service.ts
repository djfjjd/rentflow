import {
  mockDriveUpload,
  type DriveBusinessFolder,
  type DriveFileKind,
  type DriveUploadResult,
} from "@/lib/google-drive";

export type UploadFileMetadata = {
  vehicleNumber: string;
  claimNumber?: string;
  businessFolder: DriveBusinessFolder;
  fileKind: DriveFileKind;
  uploadedBy?: string;
  intakeType?: "insurance" | "selfPay" | "selfService";
  orderer?: string;
  repairShop?: string;
  customerCar?: string;
  customerName?: string;
  customerPhone?: string;
  memo?: string;
};

export type StoredFileMetadata = DriveUploadResult & {
  cloudflare?: CloudflareUploadResult;
  supabasePayload: {
    drive_file_id: string;
    drive_url: string;
    folder_path: string;
    stored_file_name: string;
    original_file_name: string;
    vehicle_number: string;
    claim_number?: string;
    business_folder: DriveBusinessFolder;
    file_kind: DriveFileKind;
    mime_type: string;
    size: number;
    intake_type?: UploadFileMetadata["intakeType"];
    orderer?: string;
    repair_shop?: string;
    customer_car?: string;
    customer_name?: string;
    customer_phone?: string;
  };
};

export type CloudflareUploadResult = {
  stored: boolean;
  key?: string;
  url?: string;
  fallback?: boolean;
};

export async function uploadFilesToDrive(files: File[], metadata: UploadFileMetadata): Promise<StoredFileMetadata[]> {
  const uploaded = await Promise.all(
    files.map(async (file, index) => {
      const result = await mockDriveUpload({
        file,
        vehicleNumber: metadata.vehicleNumber,
        claimNumber: metadata.claimNumber,
        businessFolder: metadata.businessFolder,
        fileKind: metadata.fileKind,
        sequence: index + 1,
        uploadedBy: metadata.uploadedBy,
      });

      const cloudflare = await uploadFileToCloudflare(file, result, metadata);

      return toStoredFileMetadata(result, metadata, cloudflare);
    }),
  );

  return uploaded;
}

export function toStoredFileMetadata(
  result: DriveUploadResult,
  metadata: UploadFileMetadata = {
    vehicleNumber: result.vehicleNumber,
    claimNumber: result.claimNumber,
    businessFolder: result.businessFolder,
    fileKind: result.fileKind,
  },
  cloudflare?: CloudflareUploadResult,
): StoredFileMetadata {
  return {
    ...result,
    cloudflare,
    supabasePayload: {
      drive_file_id: result.driveFileId,
      drive_url: result.driveUrl,
      folder_path: result.folderPath,
      stored_file_name: result.storedFileName,
      original_file_name: result.originalFileName,
      vehicle_number: result.vehicleNumber,
      claim_number: result.claimNumber,
      business_folder: result.businessFolder,
      file_kind: result.fileKind,
      mime_type: result.mimeType,
      size: result.size,
      intake_type: metadata.intakeType,
      orderer: metadata.orderer,
      repair_shop: metadata.repairShop,
      customer_car: metadata.customerCar,
      customer_name: metadata.customerName,
      customer_phone: metadata.customerPhone,
    },
  };
}

async function uploadFileToCloudflare(file: File, result: DriveUploadResult, metadata: UploadFileMetadata) {
  if (typeof window === "undefined") return undefined;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("metadata", JSON.stringify({
    ...metadata,
    storedFileName: result.storedFileName,
    folderPath: result.folderPath,
    uploadedAt: result.uploadedAt,
    originalFileName: result.originalFileName,
    mimeType: result.mimeType,
    size: result.size,
  }));

  const response = await fetch("/api/uploads", {
    method: "POST",
    body: formData,
  }).catch(() => undefined);

  if (!response?.ok) {
    return {
      stored: false,
      fallback: true,
    };
  }

  return (await response.json()) as CloudflareUploadResult;
}
