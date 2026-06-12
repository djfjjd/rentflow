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
};

export type StoredFileMetadata = DriveUploadResult & {
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
  };
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

      return toStoredFileMetadata(result);
    }),
  );

  return uploaded;
}

export function toStoredFileMetadata(result: DriveUploadResult): StoredFileMetadata {
  return {
    ...result,
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
    },
  };
}
