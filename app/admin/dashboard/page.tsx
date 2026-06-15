"use client";

import { AutoReturnProcessBoard } from "@/components/erp/HistoryBoards";
import { AdminShell, StatCard } from "@/components/erp/Shell";
import { VehicleStatusBoard } from "@/components/erp/VehicleStatusBoard";
import { adminNavItems } from "@/lib/erp-data";
import { useERPState } from "@/lib/erp-state";

export default function AdminDashboardPage() {
  const { vehicles, dispatches, returns, reservations, isLoaded } = useERPState();

  const recordCount = dispatches.length + returns.length;
  const activeDispatchCount = vehicles.filter((vehicle) => vehicle.status === "배차중").length;

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-sm font-bold text-gray-500">대시보드 데이터를 불러오는 중입니다...</div>
      </div>
    );
  }

  return (
    <AdminShell title="전체 대시보드" description="사진 업로드일을 기준으로 배차 차량, 피해차량, 오더자, 수리처와 주차위치를 한눈에 확인합니다." navItems={adminNavItems}>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="전체 차량" value={`${vehicles.length}`} hint="차량번호 현황판" />
        <StatCard label="접수/배차/예약" value={`${recordCount + reservations.length}`} hint={`예약 ${reservations.length}건 포함`} />
        <StatCard label="배차중 / 대기" value={`${activeDispatchCount} / ${vehicles.filter((vehicle) => vehicle.status === "대기중").length}`} hint="차량 상태 기준" />
      </div>

      <div className="mt-5">
        <VehicleStatusBoard />
      </div>
      
      <div className="mt-5">
        <AutoReturnProcessBoard />
      </div>
    </AdminShell>
  );
}

