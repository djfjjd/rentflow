"use client";

import { CreditCard, FileUp, Plus, ReceiptText, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import {
  cardCategories,
  cardTransactions as seedTransactions,
  corporateCards as seedCards,
  type CardTransaction,
  type CardTransactionCategory,
  type CardTransactionSource,
  type CorporateCard,
  type CorporateCardStatus,
} from "@/lib/corporate-card-data";
import { mockFetchCardTransactions, parseCardCsv, autoLinkCardTransaction } from "@/services/corporate-card-api";

const emptyCard: CorporateCard = {
  id: "",
  cardName: "",
  cardNumberMasked: "",
  cardCompany: "",
  ownerName: "",
  status: "사용중",
  memo: "",
  createdAt: "2026-06-13",
  updatedAt: "2026-06-13",
};

type TransactionForm = {
  cardId: string;
  approvedAt: string;
  merchantName: string;
  amount: number;
  vatAmount: number;
  totalAmount: number;
  category: CardTransactionCategory;
  paymentType: string;
  approvalNumber: string;
  memo: string;
  linkedPlateNumber: string;
  receiptImageUrl: string;
  source: CardTransactionSource;
};

const emptyTransaction: TransactionForm = {
  cardId: "cc-1",
  approvedAt: "2026-06-13T12:00:00+09:00",
  merchantName: "",
  amount: 0,
  vatAmount: 0,
  totalAmount: 0,
  category: "기타" as CardTransactionCategory,
  paymentType: "일시불",
  approvalNumber: "",
  memo: "",
  linkedPlateNumber: "",
  receiptImageUrl: "",
  source: "수동등록" as const,
};

export function CorporateCardManager() {
  const csvInputRef = useRef<HTMLInputElement | null>(null);
  const receiptInputRef = useRef<HTMLInputElement | null>(null);
  const [cards, setCards] = useState<CorporateCard[]>(seedCards);
  const [transactions, setTransactions] = useState<CardTransaction[]>(seedTransactions);
  const [editingCard, setEditingCard] = useState<CorporateCard>({ ...emptyCard, id: crypto.randomUUID() });
  const [transactionForm, setTransactionForm] = useState(emptyTransaction);
  const [query, setQuery] = useState("");
  const [isFetching, setIsFetching] = useState(false);

  const filteredTransactions = transactions.filter((item) =>
    [item.merchantName, item.memo, item.linkedPlateNumber, item.category, item.approvalNumber].join(" ").toLowerCase().includes(query.toLowerCase()),
  );

  const saveCard = () => {
    if (!editingCard.cardName.trim()) return;

    setCards((current) => {
      const exists = current.some((item) => item.id === editingCard.id);
      if (exists) return current.map((item) => (item.id === editingCard.id ? editingCard : item));
      return [editingCard, ...current];
    });
    setEditingCard({ ...emptyCard, id: crypto.randomUUID() });
  };

  const saveTransaction = () => {
    if (!transactionForm.merchantName || !transactionForm.totalAmount) return;
    const linked = autoLinkCardTransaction({
      ...transactionForm,
      linkedPlateNumber: transactionForm.linkedPlateNumber || undefined,
    });
    setTransactions((current) => [linked, ...current]);
    setTransactionForm(emptyTransaction);
  };

  const uploadCsv = async (file: File) => {
    const text = await file.text();
    const parsed = parseCardCsv(text, cards[0]?.id ?? "cc-1");
    setTransactions((current) => [...parsed, ...current]);
  };

  const fetchMockApi = async () => {
    setIsFetching(true);
    const fetched = await mockFetchCardTransactions("2026-06-01", "2026-06-30");
    setTransactions((current) => [...fetched, ...current.filter((item) => !fetched.some((next) => next.id === item.id))]);
    setIsFetching(false);
  };

  const totalSpend = filteredTransactions.reduce((sum, item) => sum + item.totalAmount, 0);

  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
        <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-black text-ink">
            <CreditCard className="h-5 w-5 text-primary" aria-hidden="true" />
            법인카드 등록
          </h2>
          <div className="mt-4 grid gap-3">
            <TextField label="카드명" value={editingCard.cardName} onChange={(value) => setEditingCard({ ...editingCard, cardName: value })} />
            <TextField label="마스킹 카드번호" value={editingCard.cardNumberMasked} onChange={(value) => setEditingCard({ ...editingCard, cardNumberMasked: value })} />
            <TextField label="카드사" value={editingCard.cardCompany} onChange={(value) => setEditingCard({ ...editingCard, cardCompany: value })} />
            <TextField label="소유자/팀" value={editingCard.ownerName} onChange={(value) => setEditingCard({ ...editingCard, ownerName: value })} />
            <label className="grid gap-1 text-sm font-bold text-gray-600">
              상태
              <select value={editingCard.status} onChange={(event) => setEditingCard({ ...editingCard, status: event.target.value as CorporateCardStatus })} className="min-h-11 rounded-lg border border-line bg-white px-3">
                <option>사용중</option>
                <option>사용중지</option>
              </select>
            </label>
            <TextField label="메모" value={editingCard.memo} onChange={(value) => setEditingCard({ ...editingCard, memo: value })} />
            <button type="button" onClick={saveCard} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-white">
              <Plus className="h-5 w-5" aria-hidden="true" />
              카드 저장
            </button>
          </div>
        </section>

        <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-black text-ink">법인카드 목록</h2>
              <p className="mt-1 text-sm text-gray-500">실제 카드 API 인증정보는 환경변수로만 연결합니다.</p>
            </div>
            <button type="button" onClick={fetchMockApi} className="min-h-10 rounded-lg border border-line px-3 text-sm font-bold">
              {isFetching ? "API 조회중" : "mock API 가져오기"}
            </button>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {cards.map((card) => (
              <article key={card.id} className="rounded-lg bg-field p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-black text-ink">{card.cardName}</p>
                    <p className="mt-1 text-sm text-gray-500">{card.cardCompany} · {card.cardNumberMasked}</p>
                    <p className="mt-2 text-xs font-bold text-primary">{card.ownerName} · {card.status}</p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setEditingCard(card)} className="rounded-md bg-white px-2.5 py-1 text-xs font-bold">수정</button>
                    <button type="button" onClick={() => setCards((current) => current.filter((item) => item.id !== card.id))} className="rounded-md bg-white px-2.5 py-1 text-xs font-bold text-red-600">삭제</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-black text-ink">
          <ReceiptText className="h-5 w-5 text-primary" aria-hidden="true" />
          사용내역 수동 등록
        </h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <TextField label="승인일시" value={transactionForm.approvedAt} onChange={(value) => setTransactionForm({ ...transactionForm, approvedAt: value })} />
          <TextField label="사용처명" value={transactionForm.merchantName} onChange={(value) => setTransactionForm({ ...transactionForm, merchantName: value })} />
          <NumberField label="총금액" value={transactionForm.totalAmount} onChange={(value) => setTransactionForm({ ...transactionForm, totalAmount: value, amount: Math.round(value / 1.1), vatAmount: value - Math.round(value / 1.1) })} />
          <label className="grid gap-1 text-sm font-bold text-gray-600">
            카테고리
            <select value={transactionForm.category} onChange={(event) => setTransactionForm({ ...transactionForm, category: event.target.value as CardTransactionCategory })} className="min-h-11 rounded-lg border border-line bg-white px-3">
              {cardCategories.map((category) => <option key={category}>{category}</option>)}
            </select>
          </label>
          <TextField label="승인번호" value={transactionForm.approvalNumber} onChange={(value) => setTransactionForm({ ...transactionForm, approvalNumber: value })} />
          <TextField label="차량번호/OCR 메모" value={transactionForm.memo} onChange={(value) => setTransactionForm({ ...transactionForm, memo: value })} />
          <button type="button" onClick={() => receiptInputRef.current?.click()} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-line px-3 text-sm font-bold">
            영수증 사진 첨부
          </button>
          <input ref={receiptInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={(event) => setTransactionForm({ ...transactionForm, receiptImageUrl: event.target.files?.[0]?.name ?? "" })} />
          <button type="button" onClick={saveTransaction} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-white">
            <Plus className="h-4 w-4" aria-hidden="true" />
            사용내역 저장
          </button>
        </div>
      </section>

      <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-black text-ink">사용내역</h2>
            <p className="mt-1 text-sm text-gray-500">검색 결과 지출 합계: {totalSpend.toLocaleString()}원</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="사용처, 차량번호, 승인번호 검색" className="min-h-11 rounded-lg border border-line px-3" />
            <button type="button" onClick={() => csvInputRef.current?.click()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-line px-3 text-sm font-bold">
              <FileUp className="h-4 w-4" aria-hidden="true" />
              CSV/엑셀 업로드
            </button>
            <input ref={csvInputRef} type="file" accept=".csv,.txt,.xlsx,.xls" className="hidden" onChange={(event) => event.target.files?.[0] && void uploadCsv(event.target.files[0])} />
          </div>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="border-b border-line text-xs text-gray-500">
              <tr>
                <th className="py-3">승인일시</th>
                <th>사용처</th>
                <th>카테고리</th>
                <th>공급가</th>
                <th>부가세</th>
                <th>합계</th>
                <th>차량</th>
                <th>출처</th>
                <th>연결</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filteredTransactions.map((item) => (
                <tr key={item.id}>
                  <td className="py-3">{item.approvedAt}</td>
                  <td className="font-bold text-ink">{item.merchantName}</td>
                  <td>{item.category}</td>
                  <td>{item.amount.toLocaleString()}원</td>
                  <td>{item.vatAmount.toLocaleString()}원</td>
                  <td className="font-black text-ink">{item.totalAmount.toLocaleString()}원</td>
                  <td className="font-bold text-primary">{item.linkedPlateNumber ?? "-"}</td>
                  <td>{item.source}</td>
                  <td>{item.linkedMaintenanceHistoryId ? "정비이력" : item.linkedAccidentHistoryId ? "사고이력" : item.linkedPartnerId ? "거래처" : "-"}</td>
                  <td>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setTransactionForm({ ...emptyTransaction, ...item, linkedPlateNumber: item.linkedPlateNumber ?? "" })} className="rounded-md border border-line px-2 py-1 text-xs font-bold">수정</button>
                      <button type="button" onClick={() => setTransactions((current) => current.filter((next) => next.id !== item.id))} className="rounded-md border border-red-200 px-2 py-1 text-xs font-bold text-red-600">
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
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
