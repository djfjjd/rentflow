"use client";

import { Download, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { payments as seedPayments, receivables as seedReceivables, type Payment, type PaymentMethod, type Receivable } from "@/lib/finance-ops-data";
import { applyPayment, normalizeReceivableStatus } from "@/services/billing-service";

const emptyPayment: Payment = {
  id: "",
  receivableId: "recv-1",
  paymentDate: "2026-06-13",
  paymentAmount: 0,
  paymentMethod: "계좌이체",
  depositorName: "",
  memo: "",
  createdAt: "2026-06-13",
  updatedAt: "2026-06-13",
};

export function ReceivableManager({ plateNumber }: { plateNumber?: string }) {
  const [items, setItems] = useState<Receivable[]>(seedReceivables.map((item) => normalizeReceivableStatus(item)).filter((item) => !plateNumber || item.plateNumber === plateNumber));
  const [payments, setPayments] = useState<Payment[]>(seedPayments);
  const [paymentForm, setPaymentForm] = useState<Payment>({ ...emptyPayment, id: crypto.randomUUID() });
  const [query, setQuery] = useState("");

  const filtered = useMemo(
    () => items.filter((item) => [item.claimNumber, item.customerName, item.buyerName, item.insuranceCompany, item.plateNumber, item.status].join(" ").toLowerCase().includes(query.toLowerCase())),
    [items, query],
  );

  const summary = {
    total: filtered.reduce((sum, item) => sum + item.remainingAmount, 0),
    waiting: filtered.filter((item) => item.status === "입금대기").reduce((sum, item) => sum + item.remainingAmount, 0),
    partial: filtered.filter((item) => item.status === "부분입금").reduce((sum, item) => sum + item.remainingAmount, 0),
    overdue: filtered.filter((item) => item.status === "장기미수").reduce((sum, item) => sum + item.remainingAmount, 0),
    paid: payments.filter((item) => item.paymentDate.startsWith("2026-06")).reduce((sum, item) => sum + item.paymentAmount, 0),
  };

  const savePayment = () => {
    if (!paymentForm.paymentAmount) return;
    setPayments((current) => [paymentForm, ...current]);
    setItems((current) => current.map((item) => (item.id === paymentForm.receivableId ? applyPayment(item, paymentForm) : item)));
    setPaymentForm({ ...emptyPayment, id: crypto.randomUUID() });
  };

  return (
    <section className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-5">
        <Metric label="총 미수금" value={`${summary.total.toLocaleString()}원`} tone="red" />
        <Metric label="입금대기" value={`${summary.waiting.toLocaleString()}원`} tone="yellow" />
        <Metric label="부분입금" value={`${summary.partial.toLocaleString()}원`} tone="blue" />
        <Metric label="장기미수" value={`${summary.overdue.toLocaleString()}원`} tone="red" />
        <Metric label="이번달 입금액" value={`${summary.paid.toLocaleString()}원`} tone="green" />
      </div>

      {!plateNumber && (
        <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-ink">입금 등록</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-5">
            <label className="grid gap-1 text-sm font-bold text-gray-600">
              미수금
              <select value={paymentForm.receivableId} onChange={(event) => setPaymentForm({ ...paymentForm, receivableId: event.target.value })} className="min-h-11 rounded-lg border border-line bg-white px-3">
                {items.map((item) => <option key={item.id} value={item.id}>{item.buyerName} · {item.plateNumber}</option>)}
              </select>
            </label>
            <TextField label="입금일" value={paymentForm.paymentDate} onChange={(value) => setPaymentForm({ ...paymentForm, paymentDate: value })} />
            <NumberField label="입금액" value={paymentForm.paymentAmount} onChange={(value) => setPaymentForm({ ...paymentForm, paymentAmount: value })} />
            <label className="grid gap-1 text-sm font-bold text-gray-600">
              방식
              <select value={paymentForm.paymentMethod} onChange={(event) => setPaymentForm({ ...paymentForm, paymentMethod: event.target.value as PaymentMethod })} className="min-h-11 rounded-lg border border-line bg-white px-3">
                {["계좌이체", "카드", "현금", "보험사입금", "기타"].map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <TextField label="입금자" value={paymentForm.depositorName} onChange={(value) => setPaymentForm({ ...paymentForm, depositorName: value })} />
            <button type="button" onClick={savePayment} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-white md:col-span-5">
              <Plus className="h-4 w-4" aria-hidden="true" />
              입금 저장
            </button>
          </div>
        </section>
      )}

      <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-black text-ink">미수금 목록</h2>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="거래처, 보험사, 차량번호 검색" className="min-h-11 rounded-lg border border-line px-3" />
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[1060px] text-left text-sm">
            <thead className="border-b border-line text-xs text-gray-500">
              <tr>
                <th className="py-3">청구처</th>
                <th>보험접수</th>
                <th>차량번호</th>
                <th>청구금액</th>
                <th>입금액</th>
                <th>잔액</th>
                <th>기한</th>
                <th>상태</th>
                <th>PDF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filtered.map((item) => (
                <tr key={item.id}>
                  <td className="py-3 font-bold text-ink">{item.buyerName}</td>
                  <td>{item.claimNumber}</td>
                  <td className="font-bold text-primary">{item.plateNumber}</td>
                  <td>{item.totalBillingAmount.toLocaleString()}원</td>
                  <td>{item.paidAmount.toLocaleString()}원</td>
                  <td className="font-black text-ink">{item.remainingAmount.toLocaleString()}원</td>
                  <td>{item.dueDate} · {item.overdueDays}일</td>
                  <td><StatusBadge status={item.status} /></td>
                  <td><button type="button" onClick={() => window.print()} className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 text-xs font-bold"><Download className="h-3 w-3" />입금확인서</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color = status === "입금완료" ? "bg-green-100 text-green-700" : status === "입금대기" ? "bg-yellow-100 text-yellow-700" : status === "부분입금" ? "bg-blue-100 text-blue-700" : status === "장기미수" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700";
  return <span className={`rounded-md px-2.5 py-1 text-xs font-bold ${color}`}>{status}</span>;
}

function Metric({ label, value, tone }: { label: string; value: string; tone: "green" | "yellow" | "blue" | "red" }) {
  const color = tone === "green" ? "text-green-700" : tone === "yellow" ? "text-yellow-700" : tone === "blue" ? "text-blue-700" : "text-red-700";
  return (
    <article className="rounded-lg border border-line bg-white p-4 shadow-sm">
      <p className="text-xs font-bold text-gray-500">{label}</p>
      <p className={`mt-2 text-lg font-black ${color}`}>{value}</p>
    </article>
  );
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1 text-sm font-bold text-gray-600">
      {label}
      <input value={value} onChange={(event) => onChange(event.target.value)} className="min-h-11 rounded-lg border border-line px-3 text-ink" />
    </label>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="grid gap-1 text-sm font-bold text-gray-600">
      {label}
      <input type="number" value={value} onChange={(event) => onChange(Number(event.target.value))} className="min-h-11 rounded-lg border border-line px-3 text-ink" />
    </label>
  );
}
