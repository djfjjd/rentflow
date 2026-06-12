import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import type { AnalysisStep } from "./types";

type AnalysisProgressProps = {
  steps: AnalysisStep[];
  isRunning: boolean;
  isComplete?: boolean;
};

export function AnalysisProgress({ steps, isRunning, isComplete = false }: AnalysisProgressProps) {
  if (!isRunning) {
    return (
      <section className="rounded-lg border border-line bg-white p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-gray-100 text-gray-500">
            <Circle className="h-6 w-6" aria-hidden="true" />
          </span>
          <div>
          <h2 className="text-base font-bold text-ink">AI 분석 준비중</h2>
            <p className="mt-1 text-sm text-gray-500">업로드하면 OCR/AI 분석 단계가 표시됩니다.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-primary/20 bg-white p-5 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-ink">{isComplete ? "가짜 분석 완료" : "가짜 분석 진행중"}</h2>
          <p className="mt-1 text-sm text-gray-500">실제 OCR/AI API 연결 전 임시 상태입니다.</p>
        </div>
        {isComplete ? (
          <CheckCircle2 className="h-6 w-6 text-primary" aria-hidden="true" />
        ) : (
          <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
        )}
      </div>

      <ol className="mt-5 space-y-3">
        {steps.map((step) => (
          <li key={step.label} className="flex items-center gap-3">
            <StatusIcon status={step.status} />
            <span
              className={
                step.status === "pending"
                  ? "text-sm font-medium text-gray-400"
                  : "text-sm font-semibold text-ink"
              }
            >
              {step.label}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function StatusIcon({ status }: { status: AnalysisStep["status"] }) {
  if (status === "done") {
    return <CheckCircle2 className="h-6 w-6 shrink-0 text-primary" aria-hidden="true" />;
  }

  if (status === "active") {
    return <Loader2 className="h-6 w-6 shrink-0 animate-spin text-amber" aria-hidden="true" />;
  }

  return <Circle className="h-6 w-6 shrink-0 text-gray-300" aria-hidden="true" />;
}
