"use client";

import { useState } from "react";
import { partners, type Partner } from "@/lib/erp-data";

type PartnerDocumentAssistProps = {
  mode: "billing" | "tax";
};

export function PartnerDocumentAssist({ mode }: PartnerDocumentAssistProps) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Partner | null>(partners[0] ?? null);

  const matches = partners
    .filter((partner) => ["거래처", "보험사", "렌터카업체", "공업사", "정비공장"].includes(partner.type))
    .filter((partner) => !query || partner.name.includes(query) || partner.businessNumber.includes(query))
    .slice(0, 5);

  return (
    <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
      <h2 className="text-lg font-black text-ink">{mode === "billing" ? "청구서 거래처 자동완성" : "세금계산서 사업자정보 자동입력"}</h2>
      <p className="mt-1 text-sm text-gray-500">
        거래처를 선택하면 저장된 사업자번호, 담당자, 연락처, 주소가 문서 작성 폼에 자동으로 채워지는 구조입니다.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-[320px_1fr]">
        <div>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="거래처명 또는 사업자번호" className="min-h-11 w-full rounded-lg border border-line px-3" />
          <div className="mt-2 grid gap-2">
            {matches.map((partner) => (
              <button key={partner.id} type="button" onClick={() => setSelected(partner)} className="rounded-lg border border-line p-3 text-left hover:border-primary/40">
                <span className="block font-black text-ink">{partner.name}</span>
                <span className="mt-1 block text-xs text-gray-500">{partner.businessNumber} · {partner.managerName}</span>
              </button>
            ))}
            {matches.length === 0 && <div className="rounded-lg bg-field p-3 text-sm font-bold text-gray-500">저장된 거래처가 없습니다.</div>}
          </div>
        </div>
        <div className="rounded-lg bg-field p-4">
          <Info label="상호명" value={selected?.name ?? ""} />
          <Info label="사업자번호" value={selected?.businessNumber ?? ""} />
          <Info label="담당자" value={selected?.managerName ?? ""} />
          <Info label="연락처" value={selected?.phone || selected?.mobile || ""} />
          <Info label="이메일" value={selected?.email ?? ""} />
          <Info label="주소" value={`${selected?.address ?? ""} ${selected?.detailAddress ?? ""}`} />
        </div>
      </div>
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <p className="border-b border-white py-2 text-sm">
      <span className="mr-3 inline-block w-24 font-bold text-gray-500">{label}</span>
      <span className="font-semibold text-ink">{value}</span>
    </p>
  );
}
