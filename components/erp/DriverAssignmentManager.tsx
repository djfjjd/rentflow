"use client";

import { Copy, ImagePlus, PenLine, Play, CheckCircle2, MapPin, Plus } from "lucide-react";
import { useState } from "react";
import { driverAssignments as seedAssignments, drivers, type DriverAssignment, type DriverAssignmentStatus, type DriverAssignmentType } from "@/lib/finance-ops-data";
import { vehicles } from "@/lib/erp-data";
import { buildDriverAssignmentReport } from "@/services/billing-service";

const emptyAssignment: DriverAssignment = {
  id: "",
  vehicleId: "v-1",
  plateNumber: "125하0000",
  driverId: "driver-1",
  driverName: "김기사",
  assignmentType: "배차",
  pickupLocation: "",
  destination: "",
  assignedAt: "2026-06-13T09:00:00+09:00",
  status: "출발전",
  handoverMemo: "",
  photos: [],
  videos: [],
  createdAt: "2026-06-13",
  updatedAt: "2026-06-13",
};

export function DriverAssignmentManager({ plateNumber }: { plateNumber?: string }) {
  const [items, setItems] = useState<DriverAssignment[]>(seedAssignments.filter((item) => !plateNumber || item.plateNumber === plateNumber));
  const [form, setForm] = useState<DriverAssignment>({ ...emptyAssignment, id: crypto.randomUUID() });
  const [copied, setCopied] = useState("");

  const save = () => {
    if (!form.pickupLocation || !form.destination) return;
    setItems((current) => [form, ...current]);
    setForm({ ...emptyAssignment, id: crypto.randomUUID() });
  };

  const updateStatus = (id: string, status: DriverAssignmentStatus) => {
    const now = new Date().toISOString();
    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              status,
              startedAt: status === "이동중" ? now : item.startedAt,
              arrivedAt: status === "도착완료" ? now : item.arrivedAt,
              completedAt: ["고객전달완료", "회차완료"].includes(status) ? now : item.completedAt,
              updatedAt: now.slice(0, 10),
            }
          : item,
      ),
    );
  };

  const copyReport = async (item: DriverAssignment) => {
    const report = buildDriverAssignmentReport(item, item.status === "도착완료" ? "arrival" : item.status === "고객전달완료" ? "handover" : item.status === "회차완료" ? "returnComplete" : item.status === "이동중" ? "start" : "assigned");
    await navigator.clipboard?.writeText(report);
    setCopied(item.id);
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
      {!plateNumber && (
        <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-ink">운전자 배정 등록</h2>
          <div className="mt-4 grid gap-3">
            <SelectField label="차량" value={form.vehicleId} options={vehicles.map((vehicle) => ({ value: vehicle.id, label: vehicle.plateNumber }))} onChange={(vehicleId) => {
              const vehicle = vehicles.find((item) => item.id === vehicleId) ?? vehicles[0];
              setForm({ ...form, vehicleId, plateNumber: vehicle.plateNumber });
            }} />
            <SelectField label="기사" value={form.driverId} options={drivers.map((driver) => ({ value: driver.id, label: driver.name }))} onChange={(driverId) => {
              const driver = drivers.find((item) => item.id === driverId) ?? drivers[0];
              setForm({ ...form, driverId, driverName: driver.name });
            }} />
            <SelectField label="배정유형" value={form.assignmentType} options={["배차", "회차", "공장이동", "탁송", "정비입고", "정비출고", "기타"].map((item) => ({ value: item, label: item }))} onChange={(value) => setForm({ ...form, assignmentType: value as DriverAssignmentType })} />
            <TextField label="출발지" value={form.pickupLocation} onChange={(value) => setForm({ ...form, pickupLocation: value })} />
            <TextField label="도착지" value={form.destination} onChange={(value) => setForm({ ...form, destination: value })} />
            <TextField label="고객명" value={form.handoverToCustomerName ?? ""} onChange={(value) => setForm({ ...form, handoverToCustomerName: value })} />
            <TextField label="메모" value={form.handoverMemo} onChange={(value) => setForm({ ...form, handoverMemo: value })} />
            <button type="button" onClick={save} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-white">
              <Plus className="h-5 w-5" aria-hidden="true" />
              배정 저장
            </button>
          </div>
        </section>
      )}

      <section className={plateNumber ? "space-y-3 xl:col-span-2" : "space-y-3"}>
        {items.map((item) => (
          <article key={item.id} className="rounded-lg border border-line bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-sm font-bold text-primary">{item.assignmentType} · {item.status}</p>
                <h2 className="mt-1 text-xl font-black text-ink">{item.driverName} 기사 · {item.plateNumber}</h2>
                <p className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="h-4 w-4" aria-hidden="true" />
                  {item.pickupLocation} {"->"} {item.destination}
                </p>
                <p className="mt-2 text-xs font-semibold text-gray-500">배정 {item.assignedAt} · 출발 {item.startedAt ?? "-"} · 도착 {item.arrivedAt ?? "-"}</p>
              </div>
              <button type="button" onClick={() => setItems((current) => current.filter((next) => next.id !== item.id))} className="rounded-md border border-red-200 px-3 py-2 text-xs font-bold text-red-600">삭제</button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
              <ActionButton label="출발" icon={Play} onClick={() => updateStatus(item.id, "이동중")} />
              <ActionButton label="도착" icon={MapPin} onClick={() => updateStatus(item.id, "도착완료")} />
              <ActionButton label="고객전달완료" icon={CheckCircle2} onClick={() => updateStatus(item.id, "고객전달완료")} />
              <ActionButton label="회차완료" icon={CheckCircle2} onClick={() => updateStatus(item.id, "회차완료")} />
              <ActionButton label="사진첨부" icon={ImagePlus} onClick={() => updateStatus(item.id, item.status)} />
              <ActionButton label={copied === item.id ? "복사됨" : "보고문복사"} icon={Copy} onClick={() => void copyReport(item)} />
            </div>
            <div className="mt-4 rounded-lg bg-field p-4">
              <p className="text-sm font-bold text-ink">고객 인수 서명</p>
              <div className="mt-2 flex min-h-20 items-center justify-center rounded-lg border border-dashed border-primary/30 bg-white text-sm font-bold text-gray-400">
                <PenLine className="mr-2 h-4 w-4" aria-hidden="true" />
                signatureData mock
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}

function ActionButton({ label, icon: Icon, onClick }: { label: string; icon: typeof Play; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-lg border border-line bg-white px-3 text-sm font-bold text-ink hover:border-primary/40">
      <Icon className="h-4 w-4" aria-hidden="true" />
      {label}
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

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: Array<{ value: string; label: string }>; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1 text-sm font-bold text-gray-600">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} className="min-h-11 rounded-lg border border-line bg-white px-3 text-ink">
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}
