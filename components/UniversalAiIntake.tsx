"use client";

import { AlertTriangle, Car, FileImage, ImagePlus, Sparkles, UserRound, Wrench } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type IntakeAnalysis = {
  title: string;
  confidence: number;
  situation: "사고" | "정비" | "배차" | "회차" | "예약" | "일반";
  summary: string;
  fields: Array<{ label: string; value: string }>;
  actions: string[];
};

export function UniversalAiIntake() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [analyzed, setAnalyzed] = useState(false);

  const analysis = useMemo(() => analyzeIntake(text, file?.name), [file?.name, text]);
  const canAnalyze = Boolean(file || text.trim());

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const selectFile = (selectedFile: File | undefined) => {
    if (!selectedFile) return;
    setFile(selectedFile);
    setAnalyzed(false);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(selectedFile.type.startsWith("image/") ? URL.createObjectURL(selectedFile) : null);
  };

  return (
    <section className="mt-6 rounded-lg border border-line bg-white p-5 shadow-sm">
      <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
        <div>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex min-h-64 w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-primary/30 bg-field px-5 py-6 text-center transition hover:border-primary/60 hover:bg-primary/5"
          >
            {previewUrl ? (
              <img src={previewUrl} alt="업로드 미리보기" className="h-44 w-full rounded-lg object-cover" />
            ) : (
              <>
                <span className="flex h-14 w-14 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <ImagePlus className="h-8 w-8" aria-hidden="true" />
                </span>
                <span className="mt-4 text-lg font-black text-ink">사진 업로드</span>
                <span className="mt-2 text-sm leading-6 text-gray-500">사고부위, 계기판, 견적서, 카톡 캡처</span>
              </>
            )}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={(event) => selectFile(event.target.files?.[0])}
          />
          {file && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-sm font-bold text-primary">
              <FileImage className="h-4 w-4" aria-hidden="true" />
              <span className="min-w-0 truncate">{file.name}</span>
            </div>
          )}
          <textarea
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              setAnalyzed(false);
            }}
            rows={5}
            className="mt-4 w-full resize-none rounded-lg border border-line bg-white px-4 py-3 text-base leading-7 text-ink outline-none transition placeholder:text-gray-400 focus:border-primary focus:ring-4 focus:ring-primary/10"
            placeholder="차량번호, 오더자, 수리처, 고객 차종, 정비내역, 사고부위, 접수번호"
          />
          <button
            type="button"
            disabled={!canAnalyze}
            onClick={() => setAnalyzed(true)}
            className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-base font-black text-white transition hover:bg-primary-strong disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Sparkles className="h-5 w-5" aria-hidden="true" />
            AI 분석
          </button>
        </div>

        <div className="rounded-lg border border-line bg-slate-50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-primary">만능 접수 분석</p>
              <h2 className="mt-1 text-2xl font-black text-ink">{analyzed ? analysis.title : "대기중"}</h2>
            </div>
            <SituationBadge situation={analyzed ? analysis.situation : "일반"} />
          </div>

          {analyzed ? (
            <>
              <p className="mt-4 rounded-lg bg-white p-3 text-sm font-semibold leading-6 text-gray-700">{analysis.summary}</p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {analysis.fields.map((field) => (
                  <div key={field.label} className="rounded-lg bg-white px-3 py-2">
                    <p className="text-xs font-bold text-gray-500">{field.label}</p>
                    <p className="mt-1 truncate text-sm font-black text-ink">{field.value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <p className="text-xs font-bold text-gray-500">추천 처리</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {analysis.actions.map((action) => (
                    <span key={action} className="rounded-md bg-white px-3 py-2 text-xs font-black text-primary">
                      {action}
                    </span>
                  ))}
                </div>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white">
                <div className="h-full rounded-full bg-primary" style={{ width: `${analysis.confidence}%` }} />
              </div>
              <p className="mt-2 text-right text-xs font-bold text-gray-500">신뢰도 {analysis.confidence}%</p>
            </>
          ) : (
            <div className="mt-5 grid gap-3">
              <Placeholder icon={Car} text="차량번호와 접수번호를 자동 분류" />
              <Placeholder icon={UserRound} text="오더자, 고객 차종, 수리처 후보 추출" />
              <Placeholder icon={Wrench} text="정비, 사고, 배차, 회차 상황 추천" />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function analyzeIntake(text: string, fileName = ""): IntakeAnalysis {
  const source = `${text} ${fileName}`;
  const lower = source.toLowerCase();
  const plateNumber = source.match(/\d{2,3}[가-힣]\d{4}/)?.[0] ?? "-";
  const claimNumber = source.match(/(?:접수번호|보험접수|접수)[:\s-]*(\d{6,})/)?.[1] ?? source.match(/\b\d{7,12}\b/)?.[0] ?? "-";
  const orderer = readField(source, ["오더자", "발주자", "담당자", "요청자"]);
  const repairShop = readField(source, ["수리처", "공업사", "정비소", "수리공장"]);
  const customerCar = readField(source, ["고객차종", "고객 차종", "상대차종", "차종"]);
  const maintenance = readField(source, ["정비내역", "수리내역", "작업내용", "메모"]);
  const hasAccident = ["사고", "범퍼", "파손", "기스", "추돌", "보험", "도어", "휠", "유리"].some((keyword) => lower.includes(keyword));
  const hasMaintenance = ["정비", "수리", "엔진오일", "타이어", "브레이크", "배터리", "견적", "교체"].some((keyword) => lower.includes(keyword));
  const hasReturn = ["회차", "반납", "입고"].some((keyword) => lower.includes(keyword));
  const hasDispatch = ["배차", "출고", "탁송", "전달"].some((keyword) => lower.includes(keyword));
  const hasReservation = ["예약", "예정", "스케줄"].some((keyword) => lower.includes(keyword));

  const situation = hasAccident ? "사고" : hasMaintenance ? "정비" : hasReturn ? "회차" : hasDispatch ? "배차" : hasReservation ? "예약" : "일반";
  const titleMap = {
    사고: "사고/보험 접수 후보",
    정비: "정비이력 등록 후보",
    회차: "회차 보고 후보",
    배차: "배차 업무 후보",
    예약: "예약 등록 후보",
    일반: "통합 기록 후보",
  };
  const actionsMap = {
    사고: ["사고이력 생성", "정비이력 연결", "보험접수 연결"],
    정비: ["정비이력 생성", "정비예약 등록", "차량상태 변경"],
    회차: ["회차보고 저장", "주행거리 확인", "차량상태 대기"],
    배차: ["배차보고 저장", "고객정보 연결", "탁송 일정 생성"],
    예약: ["예약 등록", "차량 배정", "알림 생성"],
    일반: ["통합메모 저장", "담당자 검토", "기록 분류"],
  };

  return {
    title: titleMap[situation],
    situation,
    confidence: Math.min(96, 62 + [plateNumber, claimNumber, orderer, repairShop, customerCar, maintenance, fileName].filter(Boolean).filter((value) => value !== "-").length * 5),
    summary: `${plateNumber !== "-" ? plateNumber : "차량 미확인"} 기준으로 ${titleMap[situation]}로 분류했습니다.`,
    fields: [
      { label: "차량번호", value: plateNumber },
      { label: "보험접수번호", value: claimNumber },
      { label: "오더자", value: orderer || "-" },
      { label: "수리처", value: repairShop || "-" },
      { label: "고객 차종", value: customerCar || "-" },
      { label: "정비/작업", value: maintenance || detectWork(source) },
    ],
    actions: actionsMap[situation],
  };
}

function readField(source: string, labels: string[]) {
  for (const label of labels) {
    const match = source.match(new RegExp(`${label}\\s*[:：]?\\s*([^\\n,/]{2,24})`));
    if (match?.[1]) return match[1].trim();
  }
  return "";
}

function detectWork(source: string) {
  for (const keyword of ["엔진오일", "타이어", "브레이크", "배터리", "범퍼", "도어", "유리", "휠", "판금", "도색"]) {
    if (source.includes(keyword)) return keyword;
  }
  return "-";
}

function SituationBadge({ situation }: { situation: IntakeAnalysis["situation"] }) {
  const danger = situation === "사고" || situation === "정비";
  return (
    <span className={danger ? "inline-flex items-center gap-1 rounded-md bg-amber/10 px-3 py-1 text-sm font-black text-amber" : "inline-flex items-center gap-1 rounded-md bg-primary/10 px-3 py-1 text-sm font-black text-primary"}>
      {danger ? <AlertTriangle className="h-4 w-4" aria-hidden="true" /> : <Sparkles className="h-4 w-4" aria-hidden="true" />}
      {situation}
    </span>
  );
}

function Placeholder({ icon: Icon, text }: { icon: typeof Car; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-white p-3 text-sm font-bold text-gray-600">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <span>{text}</span>
    </div>
  );
}
