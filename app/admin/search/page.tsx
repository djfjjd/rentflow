"use client";

import Link from "next/link";
import type React from "react";
import { useMemo, useState } from "react";
import { DriveFileList } from "@/components/DriveFileList";
import { AdminShell } from "@/components/erp/Shell";
import { adminNavItems } from "@/lib/erp-data";
import { useERPState } from "@/lib/erp-state";

export default function SearchPage() {
  const { vehicles, dispatches, returns, uploadedFiles, maintenanceHistories, accidentHistories, isLoaded } = useERPState();
  const [query, setQuery] = useState("");

  const normalizedQuery = normalizeSearchValue(query);
  const vehicleResults = useMemo(() => {
    if (!normalizedQuery) return vehicles.slice(0, 8);

    return vehicles.filter((vehicle) =>
      normalizeSearchValue([vehicle.plateNumber, vehicle.model, vehicle.status, vehicle.location, vehicle.memo].join(" ")).includes(normalizedQuery),
    );
  }, [normalizedQuery, vehicles]);

  const dispatchResults = useMemo(() => {
    if (!normalizedQuery) return dispatches.slice(0, 8);

    return dispatches.filter((dispatch) =>
      normalizeSearchValue([
        dispatch.rentalCarNumber,
        dispatch.claimNumber,
        dispatch.customerName,
        dispatch.customerPhone,
        dispatch.customerCarNumber,
        dispatch.customerCarModel,
        dispatch.orderedBy,
        dispatch.repairShop,
        dispatch.notes,
        dispatch.status,
      ].join(" ")).includes(normalizedQuery),
    );
  }, [dispatches, normalizedQuery]);

  const returnResults = useMemo(() => {
    if (!normalizedQuery) return returns.slice(0, 6);

    return returns.filter((record) =>
      normalizeSearchValue([record.rentalCarNumber, record.returnAddress, record.arrivalAddress, record.notes, record.status].join(" ")).includes(normalizedQuery),
    );
  }, [normalizedQuery, returns]);

  const historyResults = useMemo(() => {
    const histories = [
      ...maintenanceHistories.map((item) => ({
        id: item.id,
        type: "정비",
        plateNumber: item.plateNumber,
        title: item.title,
        description: `${item.repairShopName} · ${item.status}`,
      })),
      ...accidentHistories.map((item) => ({
        id: item.id,
        type: "사고",
        plateNumber: item.plateNumber,
        title: item.insuranceNumber,
        description: `${item.customerName} · ${item.repairShopName} · ${item.status}`,
      })),
    ];

    if (!normalizedQuery) return histories.slice(0, 6);

    return histories.filter((item) =>
      normalizeSearchValue([item.type, item.plateNumber, item.title, item.description].join(" ")).includes(normalizedQuery),
    );
  }, [accidentHistories, maintenanceHistories, normalizedQuery]);

  const filteredFiles = useMemo(() => {
    if (!normalizedQuery) return uploadedFiles;

    return uploadedFiles.filter((file) =>
      normalizeSearchValue([
        file.vehicleNumber,
        file.insuranceNumber,
        file.customerName,
        file.fileName,
        file.r2Key,
        file.driveFileId,
      ].join(" ")).includes(normalizedQuery),
    );
  }, [normalizedQuery, uploadedFiles]);

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-sm font-bold text-gray-500">검색 데이터를 불러오는 중입니다...</div>
      </div>
    );
  }

  return (
    <AdminShell title="통합검색" description="차량, 보험접수번호, 고객명, 서류와 구글드라이브 파일을 하나의 검색 화면에서 확인합니다." navItems={adminNavItems}>
      <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="차량번호, 고객명, 보험접수번호 검색"
          className="min-h-12 w-full rounded-lg border border-line px-4"
        />
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <ResultGroup title="차량" emptyText="조회되는 차량이 없습니다.">
            {vehicleResults.map((vehicle) => (
              <Link key={vehicle.id} href={`/admin/vehicles/${vehicle.id}`} className="rounded-lg bg-field p-4 font-bold text-primary">
                차량 · {vehicle.plateNumber} · {vehicle.model}
                <span className="mt-1 block text-xs font-semibold text-gray-600">{vehicle.status} · {vehicle.location}</span>
              </Link>
            ))}
          </ResultGroup>

          <ResultGroup title="배차" emptyText="조회되는 배차 기록이 없습니다.">
            {dispatchResults.map((dispatch) => {
              const vehicleId = vehicles.find((vehicle) => vehicle.plateNumber === dispatch.rentalCarNumber)?.id;
              const content = (
                <>
                  배차 · {dispatch.rentalCarNumber} · {dispatch.customerName}
                  <span className="mt-1 block text-xs font-semibold text-gray-600">{dispatch.claimNumber} · {dispatch.repairShop} · {dispatch.status}</span>
                </>
              );

              return vehicleId ? (
                <Link key={dispatch.id} href={`/admin/vehicles/${vehicleId}`} className="rounded-lg bg-field p-4 font-bold text-ink">
                  {content}
                </Link>
              ) : (
                <div key={dispatch.id} className="rounded-lg bg-field p-4 font-bold text-ink">
                  {content}
                </div>
              );
            })}
          </ResultGroup>

          <ResultGroup title="회차" emptyText="조회되는 회차 기록이 없습니다.">
            {returnResults.map((record) => (
              <div key={record.id} className="rounded-lg bg-field p-4 font-bold text-ink">
                회차 · {record.rentalCarNumber}
                <span className="mt-1 block text-xs font-semibold text-gray-600">{record.returnAddress} → {record.arrivalAddress} · {record.status}</span>
              </div>
            ))}
          </ResultGroup>

          <ResultGroup title="정비/사고" emptyText="조회되는 정비/사고 기록이 없습니다.">
            {historyResults.map((item) => (
              <div key={`${item.type}-${item.id}`} className="rounded-lg bg-field p-4 font-bold text-ink">
                {item.type} · {item.plateNumber} · {item.title}
                <span className="mt-1 block text-xs font-semibold text-gray-600">{item.description}</span>
              </div>
            ))}
          </ResultGroup>
        </div>
      </section>
      <div className="mt-5">
        <DriveFileList initialQuery={query} files={filteredFiles} />
      </div>
    </AdminShell>
  );
}

function ResultGroup({ title, emptyText, children }: { title: string; emptyText: string; children: React.ReactNode }) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);

  return (
    <section>
      <h2 className="text-sm font-black text-ink">{title}</h2>
      <div className="mt-3 grid gap-3">
        {hasChildren ? children : <div className="rounded-lg bg-field p-4 text-sm font-bold text-gray-500">{emptyText}</div>}
      </div>
    </section>
  );
}

function normalizeSearchValue(value: string) {
  return value.replace(/\s+/g, "").toLowerCase();
}
