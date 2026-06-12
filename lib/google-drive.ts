export type DriveBusinessFolder =
  | "배차"
  | "회차"
  | "사고사진"
  | "면허증"
  | "계약서"
  | "청구서"
  | "정비";

export type DriveFileKind =
  | "사진"
  | "영상"
  | "문서"
  | "PDF"
  | "면허증"
  | "계약서"
  | "청구서"
  | "정비";

export type DriveUploadInput = {
  file: File;
  vehicleNumber: string;
  claimNumber?: string;
  businessFolder: DriveBusinessFolder;
  fileKind: DriveFileKind;
  sequence: number;
  uploadedBy?: string;
  uploadedAt?: Date;
};

export type DriveUploadResult = {
  driveFileId: string;
  driveUrl: string;
  folderPath: string;
  storedFileName: string;
  originalFileName: string;
  mimeType: string;
  size: number;
  vehicleNumber: string;
  claimNumber?: string;
  businessFolder: DriveBusinessFolder;
  fileKind: DriveFileKind;
  uploadedAt: string;
};

export type GoogleAccountState = {
  connected: boolean;
  email?: string;
};

export const driveBusinessFolders: DriveBusinessFolder[] = [
  "배차",
  "회차",
  "사고사진",
  "면허증",
  "계약서",
  "청구서",
  "정비",
];

export const mockGoogleAccount: GoogleAccountState = {
  connected: true,
  email: "rentcar.erp@example.com",
};

export function buildDriveFolderPath(date: Date, vehicleNumber: string, businessFolder: DriveBusinessFolder) {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");

  return ["렌터카ERP", year, month, sanitizePathSegment(vehicleNumber), businessFolder].join("/");
}

export function buildDriveFileName({
  date,
  vehicleNumber,
  claimNumber,
  fileKind,
  sequence,
  extension,
}: {
  date: Date;
  vehicleNumber: string;
  claimNumber?: string;
  fileKind: DriveFileKind;
  sequence: number;
  extension: string;
}) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const dateText = `${yyyy}${mm}${dd}`;
  const claim = claimNumber?.trim() || "미접수";
  const seq = String(sequence).padStart(2, "0");

  return `${dateText}_${sanitizePathSegment(vehicleNumber)}_${sanitizePathSegment(claim)}_${fileKind}_${seq}.${extension}`;
}

export function getFileExtension(fileName: string, mimeType?: string) {
  const extension = fileName.split(".").pop();

  if (extension && extension !== fileName) {
    return extension.toLowerCase();
  }

  if (mimeType?.includes("pdf")) return "pdf";
  if (mimeType?.includes("png")) return "png";
  if (mimeType?.includes("jpeg")) return "jpg";
  if (mimeType?.includes("mp4")) return "mp4";

  return "bin";
}

export async function mockDriveUpload(input: DriveUploadInput): Promise<DriveUploadResult> {
  const uploadedAt = input.uploadedAt ?? new Date();
  const folderPath = buildDriveFolderPath(uploadedAt, input.vehicleNumber, input.businessFolder);
  const extension = getFileExtension(input.file.name, input.file.type);
  const storedFileName = buildDriveFileName({
    date: uploadedAt,
    vehicleNumber: input.vehicleNumber,
    claimNumber: input.claimNumber,
    fileKind: input.fileKind,
    sequence: input.sequence,
    extension,
  });
  const hashSource = `${folderPath}/${storedFileName}/${input.file.size}`;
  const driveFileId = `mock-drive-${toStableHash(hashSource)}`;

  await new Promise((resolve) => window.setTimeout(resolve, 650));

  return {
    driveFileId,
    driveUrl: `https://drive.google.com/file/d/${driveFileId}/view`,
    folderPath,
    storedFileName,
    originalFileName: input.file.name,
    mimeType: input.file.type || "application/octet-stream",
    size: input.file.size,
    vehicleNumber: input.vehicleNumber,
    claimNumber: input.claimNumber,
    businessFolder: input.businessFolder,
    fileKind: input.fileKind,
    uploadedAt: uploadedAt.toISOString(),
  };
}

export const mockDriveFiles: DriveUploadResult[] = [
  {
    driveFileId: "mock-drive-accident-001",
    driveUrl: "https://drive.google.com/file/d/mock-drive-accident-001/view",
    folderPath: "렌터카ERP/2026/06/125하0000/사고사진",
    storedFileName: "20260613_125하0000_123456789_사진_01.jpg",
    originalFileName: "accident-front.jpg",
    mimeType: "image/jpeg",
    size: 2481200,
    vehicleNumber: "125하0000",
    claimNumber: "123456789",
    businessFolder: "사고사진",
    fileKind: "사진",
    uploadedAt: "2026-06-13T01:30:00.000Z",
  },
  {
    driveFileId: "mock-drive-contract-001",
    driveUrl: "https://drive.google.com/file/d/mock-drive-contract-001/view",
    folderPath: "렌터카ERP/2026/06/125하0000/계약서",
    storedFileName: "20260613_125하0000_123456789_계약서_01.pdf",
    originalFileName: "contract.pdf",
    mimeType: "application/pdf",
    size: 881200,
    vehicleNumber: "125하0000",
    claimNumber: "123456789",
    businessFolder: "계약서",
    fileKind: "계약서",
    uploadedAt: "2026-06-13T02:10:00.000Z",
  },
  {
    driveFileId: "mock-drive-maintenance-001",
    driveUrl: "https://drive.google.com/file/d/mock-drive-maintenance-001/view",
    folderPath: "렌터카ERP/2026/06/210호7788/정비",
    storedFileName: "20260613_210호7788_미접수_정비_01.pdf",
    originalFileName: "maintenance-estimate.pdf",
    mimeType: "application/pdf",
    size: 512940,
    vehicleNumber: "210호7788",
    businessFolder: "정비",
    fileKind: "정비",
    uploadedAt: "2026-06-13T04:00:00.000Z",
  },
];

function sanitizePathSegment(value: string) {
  return value.trim().replace(/[\\/:*?"<>|]/g, "-") || "미지정";
}

function toStableHash(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash).toString(36);
}
