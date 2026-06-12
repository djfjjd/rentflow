import Link from "next/link";
import { DriveFileList } from "@/components/DriveFileList";
import { DriverAssignmentManager } from "@/components/erp/DriverAssignmentManager";
import { AccidentHistoryBoard, MaintenanceHistoryBoard, RevenueBoard } from "@/components/erp/HistoryBoards";
import { ReceivableManager } from "@/components/erp/ReceivableManager";
import { AdminShell } from "@/components/erp/Shell";
import { receivables } from "@/lib/finance-ops-data";
import { adminNavItems, vehicleHistory, vehicles } from "@/lib/erp-data";

export default async function VehicleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const vehicle = vehicles.find((item) => item.id === id) ?? vehicles[0];
  const vehicleReceivables = receivables.filter((item) => item.plateNumber === vehicle.plateNumber);
  const billingTotal = vehicleReceivables.reduce((sum, item) => sum + item.totalBillingAmount, 0);
  const remainingTotal = vehicleReceivables.reduce((sum, item) => sum + item.remainingAmount, 0);
  const paymentStatus = remainingTotal === 0 ? "입금완료" : vehicleReceivables.some((item) => item.status === "장기미수") ? "장기미수" : "입금대기";

  return (
    <AdminShell title={`${vehicle.plateNumber} 상세`} description="차량 상세, 운전자 배정, 정비/사고 이력, 매출분석, 미수금, 구글드라이브 파일을 함께 확인합니다." navItems={adminNavItems}>
      <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
        <Link href="/admin/vehicles" className="text-sm font-bold text-primary">차량 목록으로</Link>
        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <Info label="차종" value={vehicle.model} />
          <Info label="상태" value={vehicle.status} />
          <Info label="유량" value={`${vehicle.fuelLevel}%`} />
          <Info label="주행거리" value={`${vehicle.mileage.toLocaleString()}km`} />
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <Info label="청구금액" value={`${billingTotal.toLocaleString()}원`} />
          <Info label="입금상태" value={paymentStatus} />
          <Info label="미수금 잔액" value={`${remainingTotal.toLocaleString()}원`} />
        </div>
        <p className="mt-4 rounded-lg bg-field p-4 text-sm leading-6 text-gray-600">{vehicle.memo}</p>
      </section>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <History title="배차이력" items={vehicleHistory.dispatch} />
        <History title="회차이력" items={vehicleHistory.return} />
        <History title="예약이력" items={vehicleHistory.reservation} />
        <History title="기본 정비이력" items={vehicleHistory.maintenance} />
      </div>
      <div className="mt-5">
        <DriverAssignmentManager plateNumber={vehicle.plateNumber} />
      </div>
      <div className="mt-5">
        <ReceivableManager plateNumber={vehicle.plateNumber} />
      </div>
      <div className="mt-5">
        <MaintenanceHistoryBoard plateNumber={vehicle.plateNumber} />
      </div>
      <div className="mt-5">
        <AccidentHistoryBoard plateNumber={vehicle.plateNumber} />
      </div>
      <div className="mt-5">
        <RevenueBoard plateNumber={vehicle.plateNumber} />
      </div>
      <div className="mt-5">
        <DriveFileList initialQuery={vehicle.plateNumber} />
      </div>
    </AdminShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-field p-4">
      <p className="text-xs font-bold text-gray-500">{label}</p>
      <p className="mt-2 text-lg font-black text-ink">{value}</p>
    </div>
  );
}

function History({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
      <h2 className="text-lg font-black text-ink">{title}</h2>
      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li key={item} className="rounded-lg bg-field p-3 text-sm font-semibold text-gray-700">{item}</li>
        ))}
      </ul>
    </section>
  );
}
