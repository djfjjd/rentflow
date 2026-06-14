"use client";

import Link from "next/link";
import { Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { type Vehicle } from "@/lib/erp-data";
import { useERPState } from "@/lib/erp-state";

const emptyVehicle: Vehicle = {
  id: "",
  plateNumber: "",
  model: "",
  fuelType: "가솔린",
  fuelLevel: 50,
  mileage: 0,
  location: "",
  status: "대기중",
  memo: "",
};

export function VehicleManager() {
  const { vehicles: items, addVehicle, removeVehicle, isLoaded } = useERPState();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Vehicle>({ ...emptyVehicle, id: crypto.randomUUID() });

  const filtered = useMemo(
    () =>
      items.filter((item) =>
        [item.plateNumber, item.model, item.location, item.status].join(" ").toLowerCase().includes(query.toLowerCase()),
      ),
    [items, query],
  );

  const save = () => {
    if (!editing.plateNumber.trim() || !editing.model.trim()) {
      return;
    }

    addVehicle(editing);
    setEditing({ ...emptyVehicle, id: crypto.randomUUID() });
  };

  if (!isLoaded) return <div className="p-5 text-sm font-bold text-gray-500">차량 데이터를 불러오는 중입니다...</div>;

  return (
    <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
      <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
        <h2 className="text-lg font-black text-ink">{items.some((item) => item.id === editing.id) ? "차량 수정" : "차량 등록"}</h2>
        <div className="mt-4 grid gap-3">
          <TextField label="차량번호" value={editing.plateNumber} onChange={(value) => setEditing({ ...editing, plateNumber: value })} />
          <TextField label="차종" value={editing.model} onChange={(value) => setEditing({ ...editing, model: value })} />
          <label className="grid gap-1 text-sm font-bold text-gray-600">
            유종
            <select
              value={editing.fuelType === "휘발유" ? "가솔린" : editing.fuelType}
              onChange={(e) => setEditing({ ...editing, fuelType: e.target.value })}
              className="min-h-11 rounded-lg border border-line bg-white px-3 text-ink outline-none transition focus:border-primary"
            >
              <option value="가솔린">가솔린</option>
              <option value="디젤">디젤</option>
              <option value="LPG">LPG</option>
            </select>
          </label>
          <NumberField label="주행거리" value={editing.mileage} onChange={(value) => setEditing({ ...editing, mileage: value })} suffix="km" />
          <label className="grid gap-1 text-sm font-bold text-gray-600">
            메모
            <textarea
              value={editing.memo}
              onChange={(event) => setEditing({ ...editing, memo: event.target.value })}
              className="min-h-24 rounded-lg border border-line bg-white p-3 text-ink outline-none transition focus:border-primary"
            />
          </label>
          <button type="button" onClick={save} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-white transition hover:bg-primary-strong">
            <Plus className="h-5 w-5" aria-hidden="true" />
            저장
          </button>
        </div>
      </section>

      <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-black text-ink">차량 목록</h2>
          <label className="flex min-h-11 items-center gap-2 rounded-lg border border-line px-3 transition-focus-within ring-primary/10 focus-within:border-primary focus-within:ring-4">
            <Search className="h-4 w-4 text-gray-400" aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="차량번호, 차종, 위치 검색"
              className="w-full bg-transparent text-sm outline-none"
            />
          </label>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="border-b border-line text-xs text-gray-500">
              <tr>
                <th className="py-3 font-bold">차량번호</th>
                <th className="font-bold">차종</th>
                <th className="font-bold">유종</th>
                <th className="font-bold">주행거리</th>
                <th className="font-bold">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-field/50 transition-colors">
                  <td className="py-3 font-black text-primary">
                    <Link href={`/admin/vehicles/${item.id}`} className="hover:underline text-primary">
                      {item.plateNumber}
                    </Link>
                  </td>
                  <td className="font-semibold text-ink">{item.model}</td>
                  <td>{item.fuelType === "휘발유" ? "가솔린" : item.fuelType}</td>
                  <td>
                    <span className="font-semibold text-ink">{item.mileage.toLocaleString()}</span>
                    <span className="ml-0.5 text-xs text-gray-400">km</span>
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setEditing(item)}
                        className="rounded-md border border-line bg-white px-3 py-2 text-xs font-bold text-gray-600 transition hover:bg-field"
                      >
                        수정
                      </button>
                      <button
                        type="button"
                        onClick={() => removeVehicle(item.id)}
                        className="rounded-md border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-600 transition hover:bg-red-50"
                      >
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
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 rounded-lg border border-line bg-white px-3 text-ink outline-none transition focus:border-primary"
      />
    </label>
  );
}

function NumberField({ label, value, onChange, suffix }: { label: string; value: number; onChange: (value: number) => void; suffix: string }) {
  return (
    <label className="grid gap-1 text-sm font-bold text-gray-600">
      {label}
      <span className="flex min-h-11 items-center rounded-lg border border-line bg-white px-3 transition-focus-within ring-primary/10 focus-within:border-primary focus-within:ring-4">
        <input type="number" value={value} onChange={(event) => onChange(Number(event.target.value))} className="w-full outline-none" />
        <span className="text-xs text-gray-400">{suffix}</span>
      </span>
    </label>
  );
}
