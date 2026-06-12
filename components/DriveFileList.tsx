"use client";

import { ExternalLink, FileText, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { mockDriveFiles, type DriveUploadResult } from "@/lib/google-drive";

type DriveFileListProps = {
  initialQuery?: string;
  files?: DriveUploadResult[];
};

export function DriveFileList({ initialQuery = "", files = mockDriveFiles }: DriveFileListProps) {
  const [query, setQuery] = useState(initialQuery);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) return files;

    return files.filter((file) =>
      [
        file.vehicleNumber,
        file.claimNumber,
        file.businessFolder,
        file.fileKind,
        file.storedFileName,
        file.originalFileName,
        file.folderPath,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [files, query]);

  return (
    <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-black text-ink">구글드라이브 파일 목록</h2>
          <p className="mt-1 text-sm text-gray-500">차량번호 또는 보험접수번호로 Drive 파일 메타데이터를 검색합니다.</p>
        </div>
        <label className="flex min-h-11 items-center gap-2 rounded-lg border border-line px-3">
          <Search className="h-4 w-4 text-gray-400" aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="125하0000 또는 123456789"
            className="w-full bg-transparent text-sm outline-none"
          />
        </label>
      </div>

      <div className="mt-4 grid gap-3">
        {filtered.map((file) => (
          <article key={file.driveFileId} className="rounded-lg border border-line p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-bold text-primary">
                  <FileText className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {file.businessFolder} · {file.fileKind}
                </p>
                <h3 className="mt-1 break-all text-base font-black text-ink">{file.storedFileName}</h3>
                <p className="mt-1 break-all text-xs text-gray-500">{file.folderPath}</p>
                <p className="mt-2 text-xs font-semibold text-gray-500">
                  차량번호 {file.vehicleNumber}
                  {file.claimNumber ? ` · 보험접수번호 ${file.claimNumber}` : ""}
                </p>
              </div>
              <a
                href={file.driveUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-line px-3 text-sm font-bold text-ink"
              >
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                Drive 열기
              </a>
            </div>
          </article>
        ))}
        {filtered.length === 0 && (
          <div className="rounded-lg bg-field p-5 text-center text-sm font-bold text-gray-500">관련 Drive 파일이 없습니다.</div>
        )}
      </div>
    </section>
  );
}
