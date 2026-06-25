"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

export default function PhotoViewerPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#111]" />}>
      <PhotoViewerContent />
    </Suspense>
  );
}

function PhotoViewerContent() {
  const params = useSearchParams();
  const src = params.get("src") || "";
  const name = params.get("name") || "사진";

  function closeView() {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    window.location.href = "/app";
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#111] text-[#16211d]">
      <header className="photo-detail-header grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
        <button className="small-btn" type="button" onClick={closeView}>← 닫기</button>
        <p className="truncate text-center text-sm font-black" title={name}>{name}</p>
        {src ? <a className="small-btn" download={name} href={src}>다운로드</a> : <span />}
      </header>
      <div className="grid min-h-[calc(100vh-72px)] place-items-center overflow-auto p-2">
        {src ? <img alt={name} className="max-h-[88vh] max-w-full object-contain" src={src} /> : <p className="font-black text-white">사진을 불러올 수 없습니다.</p>}
      </div>
    </main>
  );
}
