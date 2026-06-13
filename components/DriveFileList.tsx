"use client";

import { ExternalLink, FileText, FolderOpen, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { mockDriveFiles } from "@/lib/google-drive";

type DriveFileRecord = {
  fileName: string;
  r2Url?: string;
  r2Key?: string;
  driveBackupStatus: "success" | "failed" | "none";
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

type DriveFileListProps = {
  initialQuery?: string;
  files?: DriveFileRecord[];
};

const fallbackFiles: DriveFileRecord[] = mockDriveFiles.map((file) => ({
  fileName: file.storedFileName,
  driveBackupStatus: "success",
  driveFileId: file.driveFileId,
  driveUrl: file.driveUrl,
  driveFolderId: "",
  driveFolderUrl: "",
  vehicleNumber: file.vehicleNumber,
  insuranceNumber: file.claimNumber,
  customerName: "",
  uploadedAt: file.uploadedAt,
}));

export function DriveFileList({ initialQuery = "", files }: DriveFileListProps) {
  const [query, setQuery] = useState(initialQuery);
  const [remoteFiles, setRemoteFiles] = useState<DriveFileRecord[]>(files ?? []);
  const [isLoading, setIsLoading] = useState(!files);

  useEffect(() => {
    if (files) return;

    const controller = new AbortController();
    setIsLoading(true);

    fetch(`/api/uploads?query=${encodeURIComponent(initialQuery)}`, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : { files: [] }))
      .then((data) => setRemoteFiles(Array.isArray(data.files) && data.files.length > 0 ? data.files : fallbackFiles))
      .catch(() => setRemoteFiles(fallbackFiles))
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, [files, initialQuery]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) return remoteFiles;

    return remoteFiles.filter((file) =>
      [
        file.vehicleNumber,
        file.insuranceNumber,
        file.customerName,
        file.fileName,
        file.driveFileId,
        file.r2Key,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [remoteFiles, query]);

  return (
    <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-black text-ink">파일 저장소 (R2 + Drive)</h2>
          <p className="mt-1 text-sm text-gray-500">Cloudflare R2를 기본 저장소로 사용하며, Google Drive는 백업용으로 관리합니다.</p>
        </div>
        <label className="flex min-h-11 items-center gap-2 rounded-lg border border-line px-3">
          <Search className="h-4 w-4 text-gray-400" aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="차량번호, 보험접수번호, 고객명"
            className="w-full bg-transparent text-sm outline-none"
          />
        </label>
      </div>

      <div className="mt-4 grid gap-3">
        {isLoading && (
          <div className="rounded-lg bg-field p-5 text-center text-sm font-bold text-gray-500">목록을 불러오는 중입니다.</div>
        )}
        {!isLoading && filtered.map((file) => (
          <article key={file.r2Key || file.driveFileId || file.fileName} className="rounded-lg border border-line p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-bold text-primary">
                  <FileText className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {file.r2Url ? "R2 저장됨" : "Drive 전용"}
                  {file.driveBackupStatus === "success" && <span className="text-[10px] text-emerald-600">(Drive 백업됨)</span>}
                  {file.driveBackupStatus === "failed" && <span className="text-[10px] text-rose-600">(Drive 백업실패)</span>}
                </p>
                <h3 className="mt-1 break-all text-base font-black text-ink">{file.fileName}</h3>
                <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-gray-600">
                  <FolderLink label={`차량번호 ${file.vehicleNumber || "-"}`} href={file.vehicleFolderUrl} />
                  <FolderLink label={`보험접수번호 ${file.insuranceNumber || "-"}`} href={file.insuranceFolderUrl} />
                  <FolderLink label={`고객명 ${file.customerName || "-"}`} href={file.customerFolderUrl} />
                </div>
                <p className="mt-2 text-xs font-semibold text-gray-500">업로드 {formatDate(file.uploadedAt)}</p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                {file.r2Url && <OpenButton href={file.r2Url} label="파일 열기 (R2)" icon="file" variant="primary" />}
                {file.driveBackupStatus === "success" && (
                  <>
                    <OpenButton href={file.driveUrl} label="Google Drive" icon="file" />
                    <OpenButton href={file.driveFolderUrl} label="Drive 폴더" icon="folder" />
                  </>
                )}
              </div>
            </div>
          </article>
        ))}
        {!isLoading && filtered.length === 0 && (
          <div className="rounded-lg bg-field p-5 text-center text-sm font-bold text-gray-500">관련 파일이 없습니다.</div>
        )}
      </div>
    </section>
  );
}

function FolderLink({ label, href }: { label: string; href?: string }) {
  if (!href) return <span className="rounded-md bg-field px-2 py-1">{label}</span>;

  return (
    <a href={href} target="_blank" rel="noreferrer" className="rounded-md bg-primary/10 px-2 py-1 font-black text-primary hover:bg-primary/15">
      {label}
    </a>
  );
}

function OpenButton({ href, label, icon, variant }: { href?: string; label: string; icon: "file" | "folder"; variant?: "primary" }) {
  const Icon = icon === "folder" ? FolderOpen : ExternalLink;

  return (
    <a
      href={href || "#"}
      target={href ? "_blank" : undefined}
      rel={href ? "noreferrer" : undefined}
      aria-disabled={!href}
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-bold aria-disabled:pointer-events-none aria-disabled:opacity-40 ${
        variant === "primary" ? "bg-primary text-white border-primary" : "bg-white text-ink border-line"
      }`}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {label}
    </a>
  );
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value || "-";

  return date.toLocaleString("ko-KR");
}
