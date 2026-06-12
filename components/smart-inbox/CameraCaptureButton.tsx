"use client";

import { Camera } from "lucide-react";

type CameraCaptureButtonProps = {
  onCapture: () => void;
};

export function CameraCaptureButton({ onCapture }: CameraCaptureButtonProps) {
  return (
    <button
      type="button"
      onClick={onCapture}
      className="flex min-h-20 w-full items-center gap-4 rounded-lg border border-primary/20 bg-primary px-5 py-4 text-left text-white shadow-soft transition active:scale-[0.99]"
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white/15">
        <Camera className="h-7 w-7" aria-hidden="true" />
      </span>
      <span>
        <span className="block text-lg font-bold">카메라로 촬영</span>
        <span className="mt-1 block text-sm text-white/80">현장에서 바로 사진을 찍어 접수</span>
      </span>
    </button>
  );
}
