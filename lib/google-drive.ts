export type DriveBusinessFolder =
  | "배차"
  | "회차"
  | "차량외관사진"
  | "사고사진"
  | "면허증"
  | "계약서"
  | "청구서"
  | "정비"
  | "정비사진"
  | "보험접수자료"
  | "재직증명서"
  | "세금계산서"
  | "입금증";

export type DriveFileKind =
  | "사진"
  | "영상"
  | "문서"
  | "PDF"
  | "차량외관사진"
  | "사고사진"
  | "면허증"
  | "계약서"
  | "청구서"
  | "정비"
  | "정비사진"
  | "보험접수자료"
  | "재직증명서"
  | "세금계산서"
  | "입금증";

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
  "차량외관사진",
  "사고사진",
  "면허증",
  "계약서",
  "청구서",
  "정비",
  "정비사진",
  "보험접수자료",
  "재직증명서",
  "세금계산서",
  "입금증",
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

export const mockDriveFiles: DriveUploadResult[] = [];

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
