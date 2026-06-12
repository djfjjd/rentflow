"use client";

import { Download, Eye, Pencil, Plus, Printer, Wrench } from "lucide-react";
import { useMemo, useState } from "react";
import {
  documentTypes,
  documents as seedDocuments,
  maintenanceItems,
  partners,
  reservations,
  vehicles,
  type Partner,
  type DocumentRecord,
  type DocumentType,
} from "@/lib/erp-data";

export function ReservationBoard() {
  const days = ["2026-06-13", "2026-06-14", "2026-06-15", "2026-06-16", "2026-06-17", "2026-06-18", "2026-06-19"];
  const [factoryQuery, setFactoryQuery] = useState("");
  const [selectedFactory, setSelectedFactory] = useState<Partner | null>(partners[0]);
  const factoryMatches = partners
    .filter((partner) => ["정비공장", "공업사"].includes(partner.type))
    .filter((partner) => !factoryQuery || partner.name.includes(factoryQuery) || partner.region.includes(factoryQuery))
    .slice(0, 4);

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
        <h2 className="text-lg font-black text-ink">예약 등록 공장 자동완성</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-[320px_1fr]">
          <div>
            <input value={factoryQuery} onChange={(event) => setFactoryQuery(event.target.value)} placeholder="공장명 또는 지역 입력" className="min-h-11 w-full rounded-lg border border-line px-3" />
            <div className="mt-2 grid gap-2">
              {factoryMatches.map((partner) => (
                <button key={partner.id} type="button" onClick={() => setSelectedFactory(partner)} className="rounded-lg border border-line p-3 text-left hover:border-primary/40">
                  <span className="block font-black text-ink">{partner.name}</span>
                  <span className="mt-1 block text-xs text-gray-500">{partner.address} · {partner.phone}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-lg bg-field p-4 text-sm leading-7">
            <p><strong>공장명</strong> {selectedFactory?.name}</p>
            <p><strong>주소</strong> {selectedFactory?.address} {selectedFactory?.detailAddress}</p>
            <p><strong>연락처</strong> {selectedFactory?.phone || selectedFactory?.mobile}</p>
            <p><strong>담당자</strong> {selectedFactory?.managerName}</p>
            <p><strong>메모</strong> {selectedFactory?.memo}</p>
          </div>
        </div>
      </section>
      <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
        <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-ink">캘린더 형태</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-7">
            {days.map((day) => {
              const dayItems = reservations.filter((item) => item.date === day);
              return (
                <article key={day} className="min-h-40 rounded-lg border border-line bg-field p-3">
                  <p className="text-sm font-black text-ink">{day.slice(5)}</p>
                  <div className="mt-3 space-y-2">
                    {dayItems.map((item) => (
                      <div key={item.id} className="rounded-md bg-white p-2 text-xs shadow-sm">
                        <p className="font-black text-primary">{item.time}</p>
                        <p className="mt-1 font-bold text-ink">{item.vehicleNumber}</p>
                        <p className="text-gray-500">{item.customerName}</p>
                      </div>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
        <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-ink">리스트 형태</h2>
          <div className="mt-4 space-y-3">
            {reservations.map((item) => (
              <article key={item.id} className="rounded-lg bg-field p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-black text-ink">{item.date} {item.time}</p>
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

export function MaintenanceBoard() {
  const notices = maintenanceItems.filter((item) => item.status === "정비대기");

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
  const [selected, setSelected] = useState<DocumentRecord | null>(seedDocuments[0]);
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
