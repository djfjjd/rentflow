"use client";

import { CheckCircle2, Cloud, Link2, Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { driveBusinessFolders, mockGoogleAccount, type DriveBusinessFolder, type DriveFileKind } from "@/lib/google-drive";
import { uploadFilesToDrive, type StoredFileMetadata } from "@/services/file-upload-service";

type DriveUploadButtonProps = {
  vehicleNumber?: string;
  claimNumber?: string;
  businessFolder?: DriveBusinessFolder;
  fileKind?: DriveFileKind;
  accept?: string;
  multiple?: boolean;
  label?: string;
  onUploaded?: (files: StoredFileMetadata[]) => void;
};

export function DriveUploadButton({
  vehicleNumber = "125하0000",
  claimNumber = "123456789",
  businessFolder = "사고사진",
  fileKind = "사진",
  accept = "image/*,video/*,.pdf,.doc,.docx",
  multiple = true,
  label = "구글드라이브 업로드",
  onUploaded,
}: DriveUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<DriveBusinessFolder>(businessFolder);
  const [isUploading, setIsUploading] = useState(false);
  const [lastUploaded, setLastUploaded] = useState<StoredFileMetadata[]>([]);

  const handleFiles = async (files: FileList | null) => {
    const fileArray = Array.from(files ?? []);
    if (fileArray.length === 0) return;

    setIsUploading(true);
    const uploaded = await uploadFilesToDrive(fileArray, {
      vehicleNumber,
      claimNumber,
      businessFolder: selectedFolder,
      fileKind,
      uploadedBy: mockGoogleAccount.email,
    });
    setLastUploaded(uploaded);
    setIsUploading(false);
    onUploaded?.(uploaded);
  };

  return (
    <section className="rounded-lg border border-primary/20 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-sm font-bold text-primary">
            <Link2 className="h-4 w-4" aria-hidden="true" />
            {mockGoogleAccount.connected ? `구글 계정 연동됨 · ${mockGoogleAccount.email}` : "구글 계정 연동 필요"}
          </p>
          <h3 className="mt-1 text-lg font-black text-ink">{label}</h3>
          <p className="mt-1 text-sm text-gray-500">원본 파일은 Drive에 저장하고 DB에는 driveFileId와 driveUrl만 저장합니다.</p>
        </div>
        <select
          value={selectedFolder}
          onChange={(event) => setSelectedFolder(event.target.value as DriveBusinessFolder)}
          className="min-h-11 rounded-lg border border-line bg-white px-3 text-sm font-bold text-ink"
        >
          {driveBusinessFolders.map((folder) => (
            <option key={folder}>{folder}</option>
          ))}
        </select>
      </div>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isUploading}
        className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 text-base font-bold text-white disabled:opacity-60"
      >
        {isUploading ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <Cloud className="h-5 w-5" aria-hidden="true" />}
        {isUploading ? "Drive 업로드중" : "파일 선택 후 Drive 저장"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(event) => {
          void handleFiles(event.target.files);
          event.target.value = "";
        }}
      />

      {lastUploaded.length > 0 && (
        <div className="mt-4 space-y-2">
          {lastUploaded.map((file) => (
            <article key={file.driveFileId} className="rounded-lg bg-field p-3">
              <p className="flex items-center gap-2 text-sm font-bold text-primary">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                DB 저장 mock 완료
              </p>
              <p className="mt-1 break-all text-sm font-semibold text-ink">{file.storedFileName}</p>
              <p className="mt-1 break-all text-xs text-gray-500">{file.folderPath}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
