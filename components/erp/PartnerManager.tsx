"use client";

import Link from "next/link";
import { Copy, MapPinned, Phone, Plus, Star, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import {
  dispatches,
  documents,
  partnerStatuses,
  partnerTypes,
  partners as seedPartners,
  reservations,
  type Partner,
  type PartnerStatus,
  type PartnerType,
} from "@/lib/erp-data";

const emptyPartner: Partner = {
  id: "",
  type: "거래처",
  name: "",
  businessNumber: "",
  managerName: "",
  phone: "",
  mobile: "",
  fax: "",
  email: "",
  address: "",
  detailAddress: "",
  region: "",
  memo: "",
  tags: [],
  status: "사용중",
  favorite: false,
  createdAt: "2026-06-13",
  updatedAt: "2026-06-13",
};

type PartnerManagerProps = {
  title?: string;
  allowedTypes?: PartnerType[];
};

export function PartnerManager({ title = "거래처 목록", allowedTypes }: PartnerManagerProps) {
  const [items, setItems] = useState<Partner[]>(seedPartners.filter((item) => !allowedTypes || allowedTypes.includes(item.type)));
  const [editing, setEditing] = useState<Partner>({ ...emptyPartner, type: allowedTypes?.[0] ?? "거래처", id: crypto.randomUUID() });
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("전체");
  const [type, setType] = useState<PartnerType | "전체">(allowedTypes?.length === 1 ? allowedTypes[0] : "전체");

  const regions = useMemo(() => ["전체", ...Array.from(new Set(seedPartners.map((item) => item.region)))], []);

  const filtered = useMemo(
    () =>
      items.filter((item) => {
        const matchesQuery = [item.name, item.businessNumber, item.managerName, item.phone, item.mobile, item.address, item.tags.join(" ")]
          .join(" ")
          .toLowerCase()
          .includes(query.toLowerCase());
        const matchesRegion = region === "전체" || item.region === region;
        const matchesType = type === "전체" || item.type === type;
        return matchesQuery && matchesRegion && matchesType;
      }),
    [items, query, region, type],
  );

  const save = () => {
    if (!editing.name.trim()) return;
    setItems((current) => {
      const exists = current.some((item) => item.id === editing.id);
      if (exists) return current.map((item) => (item.id === editing.id ? editing : item));
      return [editing, ...current];
    });
    setEditing({ ...emptyPartner, type: allowedTypes?.[0] ?? "거래처", id: crypto.randomUUID() });
  };

  const remove = (id: string) => setItems((current) => current.filter((item) => item.id !== id));
  const toggleFavorite = (id: string) => setItems((current) => current.map((item) => (item.id === id ? { ...item, favorite: !item.favorite } : item)));

  return (
    <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
      <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
        <h2 className="text-lg font-black text-ink">공장/거래처 등록</h2>
        <div className="mt-4 grid gap-3">
          <SelectField label="유형" value={editing.type} options={allowedTypes ?? partnerTypes} onChange={(value) => setEditing({ ...editing, type: value as PartnerType })} />
          <TextField label="상호명" value={editing.name} onChange={(value) => setEditing({ ...editing, name: value })} />
          <TextField label="사업자번호" value={editing.businessNumber} onChange={(value) => setEditing({ ...editing, businessNumber: value })} />
          <TextField label="담당자" value={editing.managerName} onChange={(value) => setEditing({ ...editing, managerName: value })} />
          <TextField label="대표전화" value={editing.phone} onChange={(value) => setEditing({ ...editing, phone: value })} />
          <TextField label="휴대폰" value={editing.mobile} onChange={(value) => setEditing({ ...editing, mobile: value })} />
          <TextField label="팩스" value={editing.fax} onChange={(value) => setEditing({ ...editing, fax: value })} />
          <TextField label="이메일" value={editing.email} onChange={(value) => setEditing({ ...editing, email: value })} />
          <TextField label="주소" value={editing.address} onChange={(value) => setEditing({ ...editing, address: value })} />
          <TextField label="상세주소" value={editing.detailAddress} onChange={(value) => setEditing({ ...editing, detailAddress: value })} />
          <TextField label="지역" value={editing.region} onChange={(value) => setEditing({ ...editing, region: value })} />
          <TextField label="태그" value={editing.tags.join(", ")} onChange={(value) => setEditing({ ...editing, tags: value.split(",").map((tag) => tag.trim()).filter(Boolean) })} />
          <SelectField label="상태" value={editing.status} options={partnerStatuses} onChange={(value) => setEditing({ ...editing, status: value as PartnerStatus })} />
          <label className="grid gap-1 text-sm font-bold text-gray-600">
            메모
            <textarea value={editing.memo} onChange={(event) => setEditing({ ...editing, memo: event.target.value })} className="min-h-24 rounded-lg border border-line p-3 text-ink" />
          </label>
          <button type="button" onClick={save} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-white">
            <Plus className="h-5 w-5" aria-hidden="true" />
            저장
          </button>
        </div>
      </section>

      <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1fr_160px_160px]">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="상호명, 담당자, 전화번호, 주소 검색" className="min-h-11 rounded-lg border border-line px-3" />
          <select value={region} onChange={(event) => setRegion(event.target.value)} className="min-h-11 rounded-lg border border-line px-3">
            {regions.map((item) => <option key={item}>{item}</option>)}
          </select>
          <select value={type} onChange={(event) => setType(event.target.value as PartnerType | "전체")} className="min-h-11 rounded-lg border border-line px-3">
            <option>전체</option>
            {(allowedTypes ?? partnerTypes).map((item) => <option key={item}>{item}</option>)}
          </select>
        </div>

        <div className="mt-4 grid gap-3 lg:hidden">
          {filtered.map((partner) => (
            <PartnerCard key={partner.id} partner={partner} onEdit={setEditing} onRemove={remove} onFavorite={toggleFavorite} />
          ))}
        </div>

        <div className="mt-4 hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="border-b border-line text-xs text-gray-500">
              <tr>
                <th className="py-3">즐겨찾기</th>
                <th>상호명</th>
                <th>유형</th>
                <th>지역</th>
                <th>담당자</th>
                <th>연락처</th>
                <th>주소</th>
                <th>상태</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filtered.map((partner) => (
                <tr key={partner.id}>
                  <td className="py-3">
                    <FavoriteButton active={partner.favorite} onClick={() => toggleFavorite(partner.id)} />
                  </td>
                  <td className="font-black text-primary"><Link href={`/admin/partners/${partner.id}`}>{partner.name}</Link></td>
                  <td>{partner.type}</td>
                  <td>{partner.region}</td>
                  <td>{partner.managerName}</td>
                  <td>{partner.phone || partner.mobile}</td>
                  <td className="max-w-[240px] truncate">{partner.address}</td>
                  <td><span className="rounded-md bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">{partner.status}</span></td>
                  <td><PartnerActions partner={partner} onEdit={setEditing} onRemove={remove} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export function PartnerAutocomplete({
  value,
  onChange,
  onSelect,
  types = ["정비공장", "공업사"],
}: {
  value: string;
  onChange: (value: string) => void;
  onSelect: (partner: Partner) => void;
  types?: PartnerType[];
}) {
  const matches = seedPartners
    .filter((partner) => types.includes(partner.type) && partner.status === "사용중")
    .filter((partner) => !value || partner.name.toLowerCase().includes(value.toLowerCase()) || partner.region.includes(value))
    .slice(0, 5);

  return (
    <label className="grid gap-1 text-sm font-bold text-gray-600">
      공장명
      <input value={value} onChange={(event) => onChange(event.target.value)} list="partner-autocomplete" className="min-h-11 rounded-lg border border-line px-3 text-ink" />
      <datalist id="partner-autocomplete">
        {matches.map((partner) => <option key={partner.id} value={partner.name} />)}
      </datalist>
      <div className="grid gap-2">
        {matches.map((partner) => (
          <button key={partner.id} type="button" onClick={() => onSelect(partner)} className="rounded-lg border border-line bg-white p-3 text-left hover:border-primary/40">
            <span className="block font-black text-ink">{partner.name}</span>
            <span className="mt-1 block text-xs text-gray-500">{partner.address} · {partner.phone} · {partner.managerName}</span>
          </button>
        ))}
      </div>
    </label>
  );
}

export function PartnerHistory({ partnerId }: { partnerId: string }) {
  const partnerDispatches = dispatches.filter((item) => item.repairShopPartnerId === partnerId);
  const partnerReservations = reservations.filter((item) => item.repairShopPartnerId === partnerId);
  const partnerDocuments = documents.filter((item) => item.partnerId === partnerId);

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <HistoryList title="연결 배차이력" items={partnerDispatches.map((item) => `${item.claimNumber} · ${item.rentalCarNumber} · ${item.customerName}`)} />
      <HistoryList title="연결 예약이력" items={partnerReservations.map((item) => `${item.date} ${item.time} · ${item.vehicleNumber}`)} />
      <HistoryList title="연결 청구/계약이력" items={partnerDocuments.map((item) => `${item.type} · ${item.title}`)} />
    </div>
  );
}

export function openMap(provider: "naver" | "kakao" | "google", partner: Partner) {
  const query = encodeURIComponent(`${partner.name} ${partner.address}`);
  const url =
    provider === "naver"
      ? `https://map.naver.com/p/search/${query}`
      : provider === "kakao"
        ? `https://map.kakao.com/link/search/${query}`
        : `https://www.google.com/maps/search/?api=1&query=${query}`;

  window.open(url, "_blank", "noopener,noreferrer");
}

function PartnerCard({ partner, onEdit, onRemove, onFavorite }: { partner: Partner; onEdit: (partner: Partner) => void; onRemove: (id: string) => void; onFavorite: (id: string) => void }) {
  return (
    <article className="rounded-lg border border-line p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link href={`/admin/partners/${partner.id}`} className="text-lg font-black text-primary">{partner.name}</Link>
          <p className="mt-1 text-sm text-gray-500">{partner.type} · {partner.region} · {partner.status}</p>
        </div>
        <FavoriteButton active={partner.favorite} onClick={() => onFavorite(partner.id)} />
      </div>
      <p className="mt-3 text-sm font-semibold text-ink">{partner.address} {partner.detailAddress}</p>
      <p className="mt-1 text-sm text-gray-500">{partner.managerName} · {partner.phone || partner.mobile}</p>
      <div className="mt-3">
        <PartnerActions partner={partner} onEdit={onEdit} onRemove={onRemove} />
      </div>
    </article>
  );
}

function PartnerActions({ partner, onEdit, onRemove }: { partner: Partner; onEdit: (partner: Partner) => void; onRemove: (id: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      <a href={`tel:${partner.phone || partner.mobile}`} className="inline-flex min-h-9 items-center gap-1 rounded-md border border-line px-2.5 text-xs font-bold">
        <Phone className="h-3.5 w-3.5" aria-hidden="true" />
        전화
      </a>
      <button type="button" onClick={() => navigator.clipboard?.writeText(`${partner.address} ${partner.detailAddress}`)} className="inline-flex min-h-9 items-center gap-1 rounded-md border border-line px-2.5 text-xs font-bold">
        <Copy className="h-3.5 w-3.5" aria-hidden="true" />
        주소복사
      </button>
      <button type="button" onClick={() => openMap("naver", partner)} className="inline-flex min-h-9 items-center gap-1 rounded-md border border-line px-2.5 text-xs font-bold">
        <MapPinned className="h-3.5 w-3.5" aria-hidden="true" />
        네이버
      </button>
      <button type="button" onClick={() => openMap("kakao", partner)} className="inline-flex min-h-9 items-center gap-1 rounded-md border border-line px-2.5 text-xs font-bold">카카오</button>
      <button type="button" onClick={() => openMap("google", partner)} className="inline-flex min-h-9 items-center gap-1 rounded-md border border-line px-2.5 text-xs font-bold">구글</button>
      <button type="button" onClick={() => onEdit(partner)} className="inline-flex min-h-9 items-center rounded-md border border-line px-2.5 text-xs font-bold">수정</button>
      <button type="button" onClick={() => onRemove(partner.id)} className="inline-flex min-h-9 items-center rounded-md border border-red-200 px-2.5 text-xs font-bold text-red-600">
        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}

function FavoriteButton({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={active ? "text-amber" : "text-gray-300"} aria-label="즐겨찾기">
      <Star className="h-5 w-5 fill-current" aria-hidden="true" />
    </button>
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

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1 text-sm font-bold text-gray-600">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} className="min-h-11 rounded-lg border border-line bg-white px-3 text-ink">
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
    </label>
  );
}

function HistoryList({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
      <h2 className="text-lg font-black text-ink">{title}</h2>
      <div className="mt-4 grid gap-2">
        {items.length > 0 ? items.map((item) => <p key={item} className="rounded-lg bg-field p-3 text-sm font-semibold text-gray-700">{item}</p>) : <p className="rounded-lg bg-field p-3 text-sm text-gray-500">연결 이력이 없습니다.</p>}
      </div>
    </section>
  );
}
