"use client";

import { Bell, Car, ClipboardCheck, Home, Inbox, Settings } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CardReceiptOcrPanel } from "@/components/erp/CardReceiptOcrPanel";
import { analyzeSmartInboxFileName, type SmartInboxMockAnalysis } from "@/services/smart-inbox-analysis-service";
import { mockAnalyzePaymentFileName } from "@/services/billing-service";
import { AnalysisProgress } from "./AnalysisProgress";
import { ExtractedResultCard } from "./ExtractedResultCard";
import { InboxHistoryList } from "./InboxHistoryList";
import { SuggestedActionButtons } from "./SuggestedActionButtons";
import { UploadDropzone } from "./UploadDropzone";
import type { AnalysisStep, ExtractedResult, UploadKind } from "./types";

const stepLabels = [
  "OCR 분석중",
  "차량번호 확인중",
  "보험접수번호 확인중",
  "사진/문서 종류 분류중",
  "정비/사고 이력 연결 후보 찾는중",
];

const sampleResult: ExtractedResult = {
  claimNumber: "123456789",
  customerCarNumber: "12가3456",
  rentalCarNumber: "125하0000",
  photoType: "앞범퍼 사고사진",
  recommendedTask: "사고이력으로 기록",
};

export function SmartInboxHome() {
  const [uploadedKind, setUploadedKind] = useState<UploadKind | null>(null);
  const [activeStep, setActiveStep] = useState(-1);
  const [result, setResult] = useState<ExtractedResult | null>(null);
  const [analysis, setAnalysis] = useState<SmartInboxMockAnalysis | null>(null);
  const [paymentAnalysis, setPaymentAnalysis] = useState<ReturnType<typeof mockAnalyzePaymentFileName> | null>(null);

  useEffect(() => {
    if (!uploadedKind) return;

    setActiveStep(0);
    setResult(null);
    setAnalysis(null);
    setPaymentAnalysis(null);

    const timers = stepLabels.map((_, index) =>
      window.setTimeout(() => {
        setActiveStep(index);
        if (index === stepLabels.length - 1) {
          window.setTimeout(() => {
            setActiveStep(stepLabels.length);
            setAnalysis(analyzeSmartInboxFileName("125하0000_앞범퍼_사고사진.jpg"));
            setPaymentAnalysis(mockAnalyzePaymentFileName("입금_125하0000_500000.jpg"));
            setResult(sampleResult);
          }, 450);
        }
      }, index * 700),
    );

    return () => timers.forEach(window.clearTimeout);
  }, [uploadedKind]);

  const steps = useMemo<AnalysisStep[]>(
    () =>
      stepLabels.map((label, index) => ({
        label,
        status: index < activeStep ? "done" : index === activeStep ? "active" : "pending",
      })),
    [activeStep],
  );

  return (
    <main className="min-h-screen">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 pb-24 pt-5 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-primary">렌터카 사고대차 ERP</p>
            <h1 className="mt-1 text-2xl font-black tracking-normal text-ink">스마트 접수함</h1>
          </div>
          <button type="button" className="flex h-12 w-12 items-center justify-center rounded-lg border border-line bg-white text-gray-700 shadow-sm" aria-label="알림">
            <Bell className="h-6 w-6" aria-hidden="true" />
          </button>
        </header>

        <section className="mt-5 rounded-lg border border-line bg-white p-5 shadow-soft">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-ink">오늘 업무 요약</h2>
              <p className="mt-1 text-sm text-gray-500">메뉴 선택 없이 업로드하면 AI가 기록 유형을 추천합니다.</p>
            </div>
            <span className="rounded-md bg-primary/10 px-3 py-1 text-sm font-bold text-primary">mock AI</span>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-3">
            <SummaryMetric label="신규 접수" value="8" />
            <SummaryMetric label="정비 후보" value="2" tone="amber" />
            <SummaryMetric label="사고 후보" value="4" />
          </div>
        </section>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
          <div className="space-y-5">
            <UploadDropzone onUploadStart={(kind) => setUploadedKind(kind)} />
            <AnalysisProgress steps={steps} isRunning={Boolean(uploadedKind)} isComplete={Boolean(result)} />
          </div>

          <aside className="space-y-5">
            {analysis && (
              <section className="rounded-lg border border-primary/20 bg-white p-5 shadow-soft">
                <h2 className="text-lg font-black text-ink">mock 분석 추천</h2>
                <dl className="mt-4 grid gap-3 text-sm">
                  <Info label="추천 기록 유형" value={analysis.suggestedHistoryType} />
                  <Info label="사고 부위" value={analysis.detectedAccidentPart ?? "-"} />
                  <Info label="정비 유형" value={analysis.detectedMaintenanceType ?? "-"} />
                  <Info label="신뢰도" value={`${Math.round(analysis.confidenceScore * 100)}%`} />
                </dl>
              </section>
            )}
            {paymentAnalysis && (
              <section className="rounded-lg border border-primary/20 bg-white p-5 shadow-soft">
                <h2 className="text-lg font-black text-ink">입금/청구서 mock 추천</h2>
                <dl className="mt-4 grid gap-3 text-sm">
                  <Info label="추천 액션" value={paymentAnalysis.suggestedType} />
                  <Info label="차량번호" value={paymentAnalysis.plateNumber ?? "-"} />
                  <Info label="입금액" value={paymentAnalysis.paymentAmount ? `${paymentAnalysis.paymentAmount.toLocaleString()}원` : "-"} />
                  <Info label="청구처" value={"buyerName" in paymentAnalysis ? paymentAnalysis.buyerName ?? "-" : "-"} />
                </dl>
              </section>
            )}
            <ExtractedResultCard result={result} />
            <CardReceiptOcrPanel visible={Boolean(result)} />
            <SuggestedActionButtons visible={Boolean(result)} />
            <InboxHistoryList />
          </aside>
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 border-t border-line bg-white/95 backdrop-blur">
        <div className="mx-auto grid max-w-5xl grid-cols-4 px-2 py-2">
          <QuickMenu icon={Inbox} label="접수함" active />
          <QuickMenu icon={Car} label="배차" />
          <QuickMenu icon={ClipboardCheck} label="계약" />
          <QuickMenu icon={Settings} label="설정" />
        </div>
      </nav>
    </main>
  );
}

function SummaryMetric({ label, value, tone = "primary" }: { label: string; value: string; tone?: "primary" | "amber" }) {
  return (
    <div className="rounded-lg bg-field px-3 py-4 text-center">
      <p className={tone === "amber" ? "text-2xl font-black text-amber" : "text-2xl font-black text-primary"}>{value}</p>
      <p className="mt-1 text-xs font-bold text-gray-500">{label}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-field px-3 py-2">
      <dt className="font-bold text-gray-500">{label}</dt>
      <dd className="font-black text-ink">{value}</dd>
    </div>
  );
}

function QuickMenu({ icon: Icon, label, active = false }: { icon: typeof Home; label: string; active?: boolean }) {
  return (
    <button type="button" className={active ? "flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg bg-primary/10 text-primary" : "flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg text-gray-500"}>
      <Icon className="h-5 w-5" aria-hidden="true" />
      <span className="text-xs font-bold">{label}</span>
    </button>
  );
}
