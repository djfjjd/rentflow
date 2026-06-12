"use client";

import { FileImage, FileText, MessageSquareText, UploadCloud } from "lucide-react";
import { useRef } from "react";
import { DriveUploadButton } from "@/components/DriveUploadButton";
import { CameraCaptureButton } from "./CameraCaptureButton";
import type { UploadAction, UploadKind } from "./types";

const uploadActions: UploadAction[] = [
  {
    kind: "media",
    label: "사진/영상 업로드",
    description: "사고부위, 계기판, 현장 영상",
    accept: "image/*,video/*",
    icon: FileImage,
  },
  {
    kind: "kakao",
    label: "카톡 캡처 업로드",
    description: "고객 대화, 접수번호 캡처",
    accept: "image/*",
    icon: MessageSquareText,
  },
  {
    kind: "document",
    label: "문서 업로드",
    description: "보험 서류, 위임장, 계약서",
    accept: "image/*,.pdf,.doc,.docx",
    icon: FileText,
  },
];

type UploadDropzoneProps = {
  onUploadStart: (kind: UploadKind) => void;
};

export function UploadDropzone({ onUploadStart }: UploadDropzoneProps) {
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const openFilePicker = (action: UploadAction) => {
    inputRefs.current[action.kind]?.click();
  };

  return (
    <section className="rounded-lg border border-line bg-white p-4 shadow-soft">
      <div className="flex min-h-52 flex-col items-center justify-center rounded-lg border-2 border-dashed border-primary/30 bg-field px-4 py-8 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <UploadCloud className="h-9 w-9" aria-hidden="true" />
        </span>
        <h2 className="mt-4 text-2xl font-bold text-ink">스마트 접수함</h2>
        <p className="mt-2 max-w-sm text-sm leading-6 text-gray-600">
          사진, 영상, 문서를 올리면 원본은 구글드라이브에 저장하고 접수 정보 추출 화면이 준비됩니다.
        </p>
      </div>

      <div className="mt-4 grid gap-3">
        <button
          type="button"
          onClick={() => openFilePicker(uploadActions[0])}
          className="flex min-h-20 w-full items-center gap-4 rounded-lg border border-line bg-white px-5 py-4 text-left transition hover:border-primary/40 hover:bg-primary/5 active:scale-[0.99]"
        >
          <ActionIcon icon={uploadActions[0].icon} />
          <ActionText action={uploadActions[0]} />
        </button>
        <input
          ref={(node) => {
            inputRefs.current.media = node;
          }}
          type="file"
          accept={uploadActions[0].accept}
          className="hidden"
          onChange={() => onUploadStart("media")}
        />

        <CameraCaptureButton onCapture={() => onUploadStart("camera")} />

        {uploadActions.slice(1).map((action) => (
          <div key={action.kind}>
            <button
              type="button"
              onClick={() => openFilePicker(action)}
              className="flex min-h-20 w-full items-center gap-4 rounded-lg border border-line bg-white px-5 py-4 text-left transition hover:border-primary/40 hover:bg-primary/5 active:scale-[0.99]"
            >
              <ActionIcon icon={action.icon} />
              <ActionText action={action} />
            </button>
            <input
              ref={(node) => {
                inputRefs.current[action.kind] = node;
              }}
              type="file"
              accept={action.accept}
              className="hidden"
              onChange={() => onUploadStart(action.kind)}
            />
          </div>
        ))}
      </div>

      <div className="mt-4">
        <DriveUploadButton
          vehicleNumber="125하0000"
          claimNumber="123456789"
          businessFolder="사고사진"
          fileKind="사진"
          label="원본 파일 Drive 저장"
          onUploaded={() => onUploadStart("media")}
        />
      </div>
    </section>
  );
}

function ActionIcon({ icon: Icon }: { icon: UploadAction["icon"] }) {
  return (
    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-primary">
      <Icon className="h-7 w-7" aria-hidden="true" />
    </span>
  );
}

function ActionText({ action }: { action: UploadAction }) {
  return (
    <span>
      <span className="block text-lg font-bold text-ink">{action.label}</span>
      <span className="mt-1 block text-sm text-gray-500">{action.description}</span>
    </span>
  );
}
