"use client";

import { CheckCircle2, Loader2, ReceiptText } from "lucide-react";
import { useEffect, useState } from "react";
import type { CardTransaction } from "@/lib/corporate-card-data";
import { mockExtractReceiptTransaction } from "@/services/corporate-card-api";

type CardReceiptOcrPanelProps = {
  visible: boolean;
};

export function CardReceiptOcrPanel({ visible }: CardReceiptOcrPanelProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [transaction, setTransaction] = useState<CardTransaction | null>(null);

  useEffect(() => {
    if (!visible) return;

    setIsAnalyzing(true);
    setTransaction(null);
    const timer = window.setTimeout(() => {
      setTransaction(mockExtractReceiptTransaction());
      setIsAnalyzing(false);
    }, 900);

    return () => window.clearTimeout(timer);
  }, [visible]);

  if (!visible) return null;

  return (
    <section className="rounded-lg border border-primary/20 bg-white p-5 shadow-soft">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <ReceiptText className="h-6 w-6" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-lg font-black text-ink">영수증 OCR 준비중</h2>
          <p className="mt-1 text-sm text-gray-500">사용처명, 금액, 날짜, 차량번호를 추출해 CardTransaction으로 등록하는 구조입니다.</p>
        </div>
      </div>

      {isAnalyzing && (
        <p className="mt-4 flex items-center gap-2 rounded-lg bg-field p-3 text-sm font-bold text-primary">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          영수증 이미지 분석중
        </p>
      )}

      {transaction && (
        <div className="mt-4 grid gap-3">
          <Info label="사용처명" value={transaction.merchantName} />
          <Info label="승인일시" value={transaction.approvedAt} />
          <Info label="금액" value={`${transaction.totalAmount.toLocaleString()}원`} />
          <Info label="차량번호" value={transaction.linkedPlateNumber ?? "-"} />
          <Info label="자동분류" value={transaction.category} />
          <button type="button" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-white">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            CardTransaction으로 등록
          </button>
        </div>
      )}
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-field px-3 py-2 text-sm">
      <span className="font-bold text-gray-500">{label}</span>
      <span className="text-right font-black text-ink">{value}</span>
    </div>
  );
}
