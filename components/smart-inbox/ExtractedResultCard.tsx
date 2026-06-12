import { BadgeCheck, CarFront, ClipboardList, ImageIcon, ShieldCheck } from "lucide-react";
import type { ExtractedResult } from "./types";

type ExtractedResultCardProps = {
  result: ExtractedResult | null;
};

export function ExtractedResultCard({ result }: ExtractedResultCardProps) {
  if (!result) {
    return null;
  }

  const fields = [
    { label: "보험접수번호", value: result.claimNumber, icon: ShieldCheck },
    { label: "고객차량번호", value: result.customerCarNumber, icon: CarFront },
    { label: "렌트차량번호", value: result.rentalCarNumber, icon: CarFront },
    { label: "사진종류", value: result.photoType, icon: ImageIcon },
    { label: "추천작업", value: result.recommendedTask, icon: ClipboardList },
  ];

  return (
    <section className="rounded-lg border border-primary/20 bg-white p-5 shadow-soft">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <BadgeCheck className="h-6 w-6" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-lg font-bold text-ink">분석 결과 예시</h2>
          <p className="mt-1 text-sm text-gray-500">OCR/AI API 연결 전 표시되는 샘플 데이터입니다.</p>
        </div>
      </div>

      <dl className="mt-5 grid gap-3">
        {fields.map((field) => {
          const Icon = field.icon;
          return (
            <div
              key={field.label}
              className="flex items-center justify-between gap-4 rounded-lg bg-field px-4 py-3"
            >
              <dt className="flex items-center gap-2 text-sm font-semibold text-gray-600">
                <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
                {field.label}
              </dt>
              <dd className="text-right text-base font-bold text-ink">{field.value}</dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
