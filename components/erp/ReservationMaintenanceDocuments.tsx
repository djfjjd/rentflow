"use client";

import { Download, Eye, Pencil, Plus, Printer, Wrench } from "lucide-react";
import { useMemo, useState } from "react";
import {
  documentTypes,
  documents as seedDocuments,
  partners,
  type Partner,
  type DocumentRecord,
  type DocumentType,
} from "@/lib/erp-data";
import { useERPState } from "@/lib/erp-state";

export function ReservationBoard() {
  const { reservations, isLoaded } = useERPState();
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  const monthDays = new Date(currentYear, currentMonth + 1, 0).getDate();
  const days = Array.from({ length: monthDays }, (_, i) => formatDateKey(new Date(currentYear, currentMonth, i + 1)));
  
  const upcomingReservations = [...reservations].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  const reservedDays = days
    .map((day) => ({ day, items: reservations.filter((item) => item.date === day).sort((a, b) => a.time.localeCompare(b.time)) }))
    .filter((group) => group.items.length > 0);

  if (!isLoaded) return <div className="p-5 text-sm font-bold text-gray-500">예약 데이터를 불러오는 중입니다...</div>;

  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
        <section className="rounded-lg border border-line bg-white p-5 shadow-sm overflow-hidden">
          <h2 className="text-lg font-black text-ink">월간 예약 현황</h2>
          <div className="mt-4 grid grid-cols-4 gap-2 md:grid-cols-7">
            {days.map((day) => {
              const dayItems = reservations.filter((item) => item.date === day);
              const isToday = day === formatDateKey(today);
              return (
                <article key={day} className={`min-h-[120px] rounded-lg border border-line p-2 ${isToday ? "bg-primary/5 border-primary/20" : "bg-field"}`}>
                  <p className={`text-xs font-black ${isToday ? "text-primary" : "text-ink"}`}>
                    {day.slice(8)}일
                    {isToday && <span className="ml-1 text-[10px] font-bold">(오늘)</span>}
                  </p>
                  <div className="mt-2 space-y-1">
                    {dayItems.map((item) => (
                      <div key={item.id} className="rounded-md bg-white p-1.5 text-[10px] shadow-sm border border-line/50">
                        <p className="font-black text-primary leading-none">{formatReservationTime(item)}</p>
                        <p className="mt-1 font-bold text-ink truncate">{item.vehicleNumber}</p>
                        <p className="text-gray-500 truncate">{item.customerName}</p>
                      </div>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
          <div className="mt-4 space-y-3 sm:hidden">
            {reservedDays.map(({ day, items }) => (
              <article key={day} className="rounded-lg border border-line bg-field p-3">
                <h3 className="text-sm font-black text-ink">{formatKoreanDate(day)}</h3>
                <div className="mt-3 space-y-2">
                  {items.map((item) => (
                    <div key={item.id} className="rounded-lg border border-line/60 bg-white p-3 text-sm shadow-sm">
                      <p className="font-black text-primary">{formatReservationTime(item)}</p>
                      <p className="mt-1 leading-5 text-ink">
                        {[item.customerName, item.route, item.vehicleNumber].filter(Boolean).join(" ")}
                      </p>
                    </div>
                  ))}
                </div>
              </article>
            ))}
            {reservedDays.length === 0 && (
              <div className="rounded-lg border border-dashed border-line bg-field p-5 text-center text-sm font-bold text-gray-500">이번 달 예약 일정이 없습니다.</div>
            )}
          </div>
        </section>
        <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-ink">다가오는 일정</h2>
          <div className="mt-4 space-y-3 max-h-[800px] overflow-y-auto pr-1">
            {upcomingReservations.map((item) => (
              <article key={item.id} className="rounded-lg bg-field p-4 border border-line/50 hover:border-primary/30 transition-colors">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-black text-ink">{item.date} {formatReservationTime(item)}</p>
                  <span className="rounded-md bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">{item.status}</span>
                </div>
                <p className="mt-2 text-sm text-gray-600">{item.vehicleNumber} · {item.customerName} · {item.route}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatKoreanDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  const weekdays = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];
  return `${date.getMonth() + 1}월 ${date.getDate()}일 ${weekdays[date.getDay()]}`;
}

function formatReservationTime(item: { time: string; endTime?: string }) {
  return item.endTime ? `${item.time}~${item.endTime}` : item.time;
}

export function MaintenanceBoard() {
  const { maintenance: maintenanceItems, vehicles, isLoaded } = useERPState();
  const notices = maintenanceItems.filter((item) => item.status === "정비대기");

  if (!isLoaded) return <div className="p-5 text-sm font-bold text-gray-500">정비 데이터를 불러오는 중입니다...</div>;

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
      <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
        <h2 className="text-lg font-black text-ink">정비관리</h2>
        <p className="mt-1 text-sm text-gray-500">차량이 배차중이면 정비 상태가 차량운행중이라 대기로 표시됩니다.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-line text-xs text-gray-500">
              <tr>
                <th className="py-3">차량번호</th>
                <th>차량상태</th>
                <th>정비항목</th>
                <th>요청일</th>
                <th>정비상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {maintenanceItems.map((item) => {
                const vehicle = vehicles.find((vehicleItem) => vehicleItem.plateNumber === item.vehicleNumber);
                const computedStatus = vehicle?.status === "배차중" ? "차량운행중이라 대기" : item.status;
                return (
                  <tr key={item.id}>
                    <td className="py-3 font-black text-primary">{item.vehicleNumber}</td>
                    <td>{vehicle?.status ?? "확인필요"}</td>
                    <td className="font-semibold text-ink">{item.title}</td>
                    <td>{item.requestedAt}</td>
                    <td><span className="rounded-md bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">{computedStatus}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      <aside className="rounded-lg border border-amber/30 bg-white p-5 shadow-sm">
        <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-amber/10 text-amber">
          <Wrench className="h-6 w-6" aria-hidden="true" />
        </span>
        <h2 className="mt-4 text-lg font-black text-ink">회차 완료 시 알림</h2>
        <p className="mt-2 text-sm leading-6 text-gray-500">회차 완료 이벤트가 들어오면 해당 차량의 정비대기 알림을 생성하는 구조입니다.</p>
        <div className="mt-4 space-y-2">
          {notices.map((item) => (
            <p key={item.id} className="rounded-lg bg-amber/10 p-3 text-sm font-bold text-amber">{item.vehicleNumber} · {item.title}</p>
          ))}
        </div>
      </aside>
    </div>
  );
}

export function DocumentCenter() {
  const [items, setItems] = useState<DocumentRecord[]>(seedDocuments);
  const [selected, setSelected] = useState<DocumentRecord | null>(seedDocuments[0] ?? null);
  const [type, setType] = useState<DocumentType>("계약서");
  const [title, setTitle] = useState("");

  const grouped = useMemo(
    () => documentTypes.map((documentType) => ({ type: documentType, count: items.filter((item) => item.type === documentType).length })),
    [items],
  );

  const add = () => {
    const next: DocumentRecord = {
      id: crypto.randomUUID(),
      type,
      title: title || `${type} 신규 문서`,
      target: "신규 대상",
      updatedAt: "2026-06-13",
      status: "작성중",
    };
    setItems((current) => [next, ...current]);
    setSelected(next);
    setTitle("");
  };

  const printPdf = () => {
    window.print();
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[340px_1fr]">
      <section className="rounded-lg border border-line bg-white p-5 shadow-sm print:hidden">
        <h2 className="text-lg font-black text-ink">서류 등록</h2>
        <div className="mt-4 grid gap-3">
          <label className="grid gap-1 text-sm font-bold text-gray-600">
            서류 종류
            <select value={type} onChange={(event) => setType(event.target.value as DocumentType)} className="min-h-11 rounded-lg border border-line px-3">
              {documentTypes.map((documentType) => (
                <option key={documentType}>{documentType}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-bold text-gray-600">
            제목
            <input value={title} onChange={(event) => setTitle(event.target.value)} className="min-h-11 rounded-lg border border-line px-3" />
          </label>
          <button type="button" onClick={add} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-white">
            <Plus className="h-5 w-5" aria-hidden="true" />
            등록
          </button>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2">
          {grouped.map((group) => (
            <button key={group.type} type="button" className="rounded-lg bg-field p-3 text-left">
              <p className="text-xs font-bold text-gray-500">{group.type}</p>
              <p className="mt-1 text-lg font-black text-primary">{group.count}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 print:hidden sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-black text-ink">문서 목록</h2>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-line px-3 text-sm font-bold">
              <Pencil className="h-4 w-4" aria-hidden="true" />
              수정
            </button>
            <button type="button" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-line px-3 text-sm font-bold">
              <Eye className="h-4 w-4" aria-hidden="true" />
              미리보기
            </button>
            <button type="button" onClick={printPdf} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-3 text-sm font-bold text-white">
              <Download className="h-4 w-4" aria-hidden="true" />
              PDF 다운로드
            </button>
          </div>
        </div>
        <div className="mt-4 grid gap-3 print:hidden">
          {items.map((item) => (
            <button key={item.id} type="button" onClick={() => setSelected(item)} className="rounded-lg border border-line p-4 text-left hover:border-primary/40">
              <div className="flex items-center justify-between gap-3">
                <p className="font-black text-ink">{item.title}</p>
                <span className="rounded-md bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-700">{item.status}</span>
              </div>
              <p className="mt-1 text-sm text-gray-500">{item.type} · {item.target} · {item.updatedAt}</p>
            </button>
          ))}
        </div>

        <article className="mt-5 rounded-lg border border-line bg-white p-8 print:mt-0 print:border-0 print:shadow-none">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-primary">{selected?.type}</p>
              <h3 className="mt-2 text-3xl font-black text-ink">{selected?.title}</h3>
            </div>
            <Printer className="h-8 w-8 text-gray-300 print:hidden" aria-hidden="true" />
          </div>
          <div className="mt-8 grid gap-4 text-sm leading-7 text-gray-700">
            <p>대상: {selected?.target}</p>
            <p>작성일: {selected?.updatedAt}</p>
            <p>본문: 실제 PDF 생성 엔진 연결 전까지 브라우저 print 기능으로 PDF 저장을 지원합니다.</p>
            <p>서명: ____________________</p>
          </div>
        </article>
      </section>
    </div>
  );
}
