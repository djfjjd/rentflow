"use client";

import { Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import type { ExtraBillingItem } from "@/lib/finance-ops-data";
import { calculateBilling } from "@/services/billing-service";

const examples = ["탁송비", "주유비", "하이패스", "주차비", "세차비", "기타비용"];

export function BillingCalculatorPanel() {
  const [rentStartDate, setRentStartDate] = useState("2026-06-01");
  const [rentEndDate, setRentEndDate] = useState("2026-06-10");
  const [dailyRate, setDailyRate] = useState(100000);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [extraItems, setExtraItems] = useState<ExtraBillingItem[]>([
    { id: "tmp-1", billingCalculatorId: "draft", itemName: "탁송비", quantity: 1, unitPrice: 50000, amount: 50000, memo: "" },
  ]);

  const result = useMemo(
    () => calculateBilling({ rentStartDate, rentEndDate, dailyRate, extraItems, discountAmount }),
    [rentStartDate, rentEndDate, dailyRate, extraItems, discountAmount],
  );

  const addItem = () => {
    setExtraItems((current) => [
      ...current,
      { id: crypto.randomUUID(), billingCalculatorId: "draft", itemName: "기타비용", quantity: 1, unitPrice: 0, amount: 0, memo: "" },
    ]);
  };

  const updateItem = (id: string, patch: Partial<ExtraBillingItem>) => {
    setExtraItems((current) =>
      current.map((item) => {
        if (item.id !== id) return item;
        const next = { ...item, ...patch };
        return { ...next, amount: next.quantity * next.unitPrice };
      }),
    );
  };

  return (
    <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
      <h2 className="text-lg font-black text-ink">청구금액 계산기</h2>
      <p className="mt-1 text-sm text-gray-500">계산 결과는 청구서 총액과 미수금 총액에 자동 반영되는 구조입니다.</p>
      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <DateField label="대여 시작일" value={rentStartDate} onChange={setRentStartDate} />
        <DateField label="대여 종료일" value={rentEndDate} onChange={setRentEndDate} />
        <NumberField label="일대여료" value={dailyRate} onChange={setDailyRate} />
        <NumberField label="할인금액" value={discountAmount} onChange={setDiscountAmount} />
      </div>

      <div className="mt-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-black text-ink">추가비용 항목</h3>
          <button type="button" onClick={addItem} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-line px-3 text-sm font-bold">
            <Plus className="h-4 w-4" aria-hidden="true" />
            항목 추가
          </button>
        </div>
        <div className="grid gap-3">
          {extraItems.map((item) => (
            <div key={item.id} className="grid gap-2 rounded-lg bg-field p-3 md:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr_auto]">
              <select value={item.itemName} onChange={(event) => updateItem(item.id, { itemName: event.target.value })} className="min-h-10 rounded-lg border border-line bg-white px-3">
                {examples.map((example) => <option key={example}>{example}</option>)}
              </select>
              <input type="number" value={item.quantity} onChange={(event) => updateItem(item.id, { quantity: Number(event.target.value) })} className="min-h-10 rounded-lg border border-line px-3" />
              <input type="number" value={item.unitPrice} onChange={(event) => updateItem(item.id, { unitPrice: Number(event.target.value) })} className="min-h-10 rounded-lg border border-line px-3" />
              <p className="flex min-h-10 items-center rounded-lg bg-white px-3 text-sm font-black text-ink">{item.amount.toLocaleString()}원</p>
              <button type="button" onClick={() => setExtraItems((current) => current.filter((next) => next.id !== item.id))} className="rounded-lg border border-red-200 px-3 text-red-600">
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <Metric label="대여일수" value={`${result.rentalDays}일`} />
        <Metric label="대여료" value={`${result.rentalAmount.toLocaleString()}원`} />
        <Metric label="추가비용" value={`${result.extraItemsTotal.toLocaleString()}원`} />
        <Metric label="공급가액" value={`${result.supplyAmount.toLocaleString()}원`} />
        <Metric label="부가세 10%" value={`${result.vatAmount.toLocaleString()}원`} />
        <Metric label="총 청구금액" value={`${result.totalAmount.toLocaleString()}원`} strong />
      </div>
    </section>
  );
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1 text-sm font-bold text-gray-600">
      {label}
      <input type="date" value={value} onChange={(event) => onChange(event.target.value)} className="min-h-11 rounded-lg border border-line px-3" />
    </label>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="grid gap-1 text-sm font-bold text-gray-600">
      {label}
      <input type="number" value={value} onChange={(event) => onChange(Number(event.target.value))} className="min-h-11 rounded-lg border border-line px-3" />
    </label>
  );
}

function Metric({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <article className={strong ? "rounded-lg bg-primary p-4 text-white" : "rounded-lg bg-field p-4"}>
      <p className={strong ? "text-xs font-bold text-white/70" : "text-xs font-bold text-gray-500"}>{label}</p>
      <p className="mt-2 text-lg font-black">{value}</p>
    </article>
  );
}
