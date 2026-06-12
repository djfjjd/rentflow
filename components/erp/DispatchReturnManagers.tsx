"use client";

import { Paperclip, Plus } from "lucide-react";
import { useState } from "react";
import { PartnerAutocomplete } from "@/components/erp/PartnerManager";
import { ReportTools } from "@/components/erp/ReportTools";
import {
  dispatches as seedDispatches,
  returns as seedReturns,
  type Dispatch,
  type ReturnRecord,
} from "@/lib/erp-data";

const emptyDispatch: Dispatch = {
  id: "",
  claimNumber: "",
  customerName: "",
  customerPhone: "",
  customerCarNumber: "",
  customerCarModel: "",
  rentalCarNumber: "",
  orderedBy: "",
  repairShop: "",
  repairShopPartnerId: undefined,
  repairShopPhone: "",
  repairShopManagerName: "",
  pickupAddress: "",
  deliveryAddress: "",
  fuelLevel: 50,
  notes: "",
  status: "배차등록",
};

const emptyReturn: ReturnRecord = {
  id: "",
  rentalCarNumber: "",
  returnAddress: "",
  arrivalAddress: "",
  fuelLevel: 50,
  mileage: 0,
  notes: "",
  status: "회차등록",
};

export function DispatchManager() {
  const [items, setItems] = useState<Dispatch[]>(seedDispatches);
  const [form, setForm] = useState<Dispatch>({ ...emptyDispatch, id: crypto.randomUUID() });

  const save = () => {
    if (!form.claimNumber || !form.rentalCarNumber) return;
    setItems((current) => [form, ...current]);
    setForm({ ...emptyDispatch, id: crypto.randomUUID() });
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
      <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
        <h2 className="text-lg font-black text-ink">배차 등록</h2>
        <div className="mt-4 grid gap-3">
          <Field label="보험접수번호" value={form.claimNumber} onChange={(value) => setForm({ ...form, claimNumber: value })} />
          <Field label="고객명" value={form.customerName} onChange={(value) => setForm({ ...form, customerName: value })} />
          <Field label="고객연락처" value={form.customerPhone} onChange={(value) => setForm({ ...form, customerPhone: value })} />
          <Field label="고객차량번호" value={form.customerCarNumber} onChange={(value) => setForm({ ...form, customerCarNumber: value })} />
          <Field label="고객차종" value={form.customerCarModel} onChange={(value) => setForm({ ...form, customerCarModel: value })} />
          <Field label="렌트차량번호" value={form.rentalCarNumber} onChange={(value) => setForm({ ...form, rentalCarNumber: value })} />
          <Field label="오더자" value={form.orderedBy} onChange={(value) => setForm({ ...form, orderedBy: value })} />
          <PartnerAutocomplete
            value={form.repairShop}
            onChange={(value) => setForm({ ...form, repairShop: value })}
            onSelect={(partner) =>
              setForm({
                ...form,
                repairShop: partner.name,
                repairShopPartnerId: partner.id,
                repairShopPhone: partner.phone || partner.mobile,
                repairShopManagerName: partner.managerName,
                pickupAddress: partner.address,
                notes: [form.notes, partner.memo].filter(Boolean).join("\n"),
              })
            }
          />
          <Field label="공장 주소" value={form.pickupAddress} onChange={(value) => setForm({ ...form, pickupAddress: value })} />
          <Field label="공장 연락처" value={form.repairShopPhone ?? ""} onChange={(value) => setForm({ ...form, repairShopPhone: value })} />
          <Field label="공장 담당자" value={form.repairShopManagerName ?? ""} onChange={(value) => setForm({ ...form, repairShopManagerName: value })} />
          <Field label="탁송지" value={form.deliveryAddress} onChange={(value) => setForm({ ...form, deliveryAddress: value })} />
          <NumberField label="유량" value={form.fuelLevel} onChange={(value) => setForm({ ...form, fuelLevel: value })} />
          <Field label="특이사항/공장 메모" value={form.notes} onChange={(value) => setForm({ ...form, notes: value })} />
          <AttachmentField />
          <button type="button" onClick={save} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-white">
            <Plus className="h-5 w-5" aria-hidden="true" />
            배차 저장
          </button>
        </div>
      </section>
      <section className="space-y-4">
        {items.map((item) => (
          <article key={item.id} className="rounded-lg border border-line bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-black text-ink">{item.rentalCarNumber} · {item.customerName}</h3>
                <p className="mt-1 text-sm text-gray-500">{item.claimNumber} / {item.repairShop} / {item.pickupAddress} {"->"} {item.deliveryAddress}</p>
              </div>
              <span className="rounded-md bg-primary/10 px-3 py-1 text-xs font-bold text-primary">{item.status}</span>
            </div>
            <div className="mt-4">
              <ReportTools type="dispatch" record={item} />
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}

export function ReturnManager() {
  const [items, setItems] = useState<ReturnRecord[]>(seedReturns);
  const [form, setForm] = useState<ReturnRecord>({ ...emptyReturn, id: crypto.randomUUID() });

  const save = () => {
    if (!form.rentalCarNumber || !form.returnAddress) return;
    setItems((current) => [form, ...current]);
    setForm({ ...emptyReturn, id: crypto.randomUUID() });
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
      <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
        <h2 className="text-lg font-black text-ink">회차 등록</h2>
        <div className="mt-4 grid gap-3">
          <Field label="렌트차량번호" value={form.rentalCarNumber} onChange={(value) => setForm({ ...form, rentalCarNumber: value })} />
          <Field label="회차지" value={form.returnAddress} onChange={(value) => setForm({ ...form, returnAddress: value })} />
          <Field label="도착지" value={form.arrivalAddress} onChange={(value) => setForm({ ...form, arrivalAddress: value })} />
          <NumberField label="유량" value={form.fuelLevel} onChange={(value) => setForm({ ...form, fuelLevel: value })} />
          <NumberField label="주행거리" value={form.mileage} onChange={(value) => setForm({ ...form, mileage: value })} />
          <Field label="특이사항" value={form.notes} onChange={(value) => setForm({ ...form, notes: value })} />
          <AttachmentField />
          <button type="button" onClick={save} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-white">
            <Plus className="h-5 w-5" aria-hidden="true" />
            회차 저장
          </button>
        </div>
      </section>
      <section className="space-y-4">
        {items.map((item) => (
          <article key={item.id} className="rounded-lg border border-line bg-white p-5 shadow-sm">
            <h3 className="text-lg font-black text-ink">{item.rentalCarNumber} 회차</h3>
            <p className="mt-1 text-sm text-gray-500">{item.returnAddress} {"->"} {item.arrivalAddress}</p>
            <div className="mt-4">
              <ReportTools type="return" record={item} />
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
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

function AttachmentField() {
  return (
    <label className="grid gap-1 text-sm font-bold text-gray-600">
      사진/영상 첨부
      <span className="flex min-h-12 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-primary/40 px-3 text-primary">
        <Paperclip className="h-5 w-5" aria-hidden="true" />
        <span>사진 또는 영상 선택</span>
        <input type="file" accept="image/*,video/*" multiple className="hidden" />
      </span>
    </label>
  );
}
