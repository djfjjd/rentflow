import { AutoReturnProcessBoard } from "@/components/erp/HistoryBoards";
import { AdminShell, StatCard } from "@/components/erp/Shell";
import { adminNavItems, dispatches, vehicles } from "@/lib/erp-data";

export default function AdminDashboardPage() {
  const boardRows = vehicles.map((vehicle) => {
    const dispatch = dispatches.find((item) => item.rentalCarNumber === vehicle.plateNumber);

    return {
      vehicleNumber: vehicle.plateNumber,
      uploadedAt: dispatch ? "2026-06-13" : "",
      fuelLevel: dispatch?.fuelLevel ?? vehicle.fuelLevel,
      damagedVehicle: dispatch ? `${dispatch.customerCarNumber} / ${dispatch.customerCarModel}` : "-",
      orderer: dispatch?.orderedBy ?? "-",
      repairShopOrParking: dispatch?.repairShop ?? vehicle.location,
      status: dispatch?.status ?? vehicle.status,
    };
  });
  const activeRows = boardRows.filter((row) => row.orderer !== "-").length;

  return (
    <AdminShell title="전체 대시보드" description="사진 업로드일을 기준으로 배차 차량, 피해차량, 오더자, 수리처와 주차위치를 한눈에 확인합니다." navItems={adminNavItems}>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="전체 차량" value={`${vehicles.length}`} hint="차량번호 현황판" />
        <StatCard label="접수/배차 기록" value={`${activeRows}`} hint="사진 업로드 연동 대상" />
        <StatCard label="대기/주차 차량" value={`${vehicles.length - activeRows}`} hint="주차위치 표시" />
      </div>

      <section className="mt-5 overflow-hidden rounded-lg border border-line bg-white shadow-sm">
        <div className="border-b border-line px-5 py-4">
          <h2 className="text-lg font-black text-ink">배차 현황판</h2>
          <p className="mt-1 text-sm text-gray-500">날짜는 사진 업로드 완료 시 기록되는 업로드일 기준으로 표시합니다.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[920px] w-full border-collapse text-left text-sm">
            <thead className="bg-field text-xs font-black text-gray-500">
              <tr>
                <th className="px-4 py-3">차량번호</th>
                <th className="px-4 py-3">날짜 / 주유량</th>
                <th className="px-4 py-3">피해차량</th>
                <th className="px-4 py-3">오더자</th>
                <th className="px-4 py-3">수리처 / 주차위치</th>
                <th className="px-4 py-3">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {boardRows.map((row) => (
                <tr key={row.vehicleNumber} className="hover:bg-primary/5">
                  <td className="px-4 py-3 font-black text-primary">{row.vehicleNumber}</td>
                  <td className="px-4 py-3 font-bold text-ink">
                    {row.uploadedAt || "사진 업로드 대기"}
                    <span className="ml-2 rounded-md bg-field px-2 py-1 text-xs text-gray-600">주유 {row.fuelLevel}%</span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-700">{row.damagedVehicle}</td>
                  <td className="px-4 py-3 font-semibold text-gray-700">{row.orderer}</td>
                  <td className="px-4 py-3 font-semibold text-gray-700">{row.repairShopOrParking}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-black text-primary">{row.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <div className="mt-5">
        <AutoReturnProcessBoard />
      </div>
    </AdminShell>
  );
}
