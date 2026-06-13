"use client";

import { AutoReturnProcessBoard } from "@/components/erp/HistoryBoards";
import { AdminShell, StatCard } from "@/components/erp/Shell";
import { adminNavItems } from "@/lib/erp-data";
import { useERPState } from "@/lib/erp-state";
import { formatParkingLocation, isVehicleNumberMatch } from "@/lib/vehicle-utils";

export default function AdminDashboardPage() {
  const { vehicles, dispatches, returns, uploadedFiles, isLoaded } = useERPState();

  const boardRows = vehicles.map((vehicle) => {
    const vehicleDispatches = dispatches.filter((item) => isVehicleNumberMatch(item.rentalCarNumber, vehicle.plateNumber));
    const latestDispatch = vehicleDispatches[0];
    const latestUpload = uploadedFiles.find((item) =>
      [item.vehicleNumber, item.fileName, item.r2Key, item.driveFileId].some((value) => isVehicleNumberMatch(value, vehicle.plateNumber)),
    );
    const latestUploadedAt = latestDispatch?.uploadedAt || latestUpload?.uploadedAt || "";
    const repairShopOrParking = formatParkingLocation(latestDispatch?.repairShop || vehicle.location) || latestDispatch?.repairShop || vehicle.location;

    return {
      id: vehicle.id,
      vehicleNumber: vehicle.plateNumber,
      uploadedAt: latestUploadedAt ? new Date(latestUploadedAt).toLocaleDateString("ko-KR") : "",
      fuelLevel: latestDispatch?.fuelLevel ?? vehicle.fuelLevel,
      damagedVehicle: latestDispatch ? formatDamagedVehicle(latestDispatch.customerCarNumber, latestDispatch.customerCarModel) : "-",
      ordererAndRepairShop: latestDispatch ? formatOrdererAndRepairShop(latestDispatch) : repairShopOrParking,
      intakeType: latestDispatch?.intakeType || latestUpload?.intakeType || (latestDispatch || latestUpload ? "insurance" : ""),
    };
  });
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
        <StatCard label="접수/배차 기록" value={`${recordCount}`} hint="배차 + 회차 기록" />
        <StatCard label="배차중 / 대기" value={`${activeDispatchCount} / ${vehicles.filter((vehicle) => vehicle.status === "대기중").length}`} hint="차량 상태 기준" />
      </div>

      <section className="mt-5 overflow-hidden rounded-lg border border-line bg-white shadow-sm">
        <div className="border-b border-line px-5 py-4">
          <h2 className="text-lg font-black text-ink">차량 현황판</h2>
          <p className="mt-1 text-sm text-gray-500">전체 차량을 기준으로 표시하고, 배차 업로드가 있으면 최신 배차 정보를 함께 보여줍니다.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[920px] w-full border-collapse text-left text-sm">
            <thead className="bg-field text-xs font-black text-gray-500">
              <tr>
                <th className="px-4 py-3">차량번호</th>
                <th className="px-4 py-3">날짜 / 주유량</th>
                <th className="px-4 py-3">피해차량</th>
                <th className="px-4 py-3">오더자/수리처</th>
                <th className="px-4 py-3">구분</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {boardRows.map((row) => (
                <tr key={row.id} className="hover:bg-primary/5">
                  <td className="px-4 py-3 font-black text-primary">{row.vehicleNumber}</td>
                  <td className="px-4 py-3 font-bold text-ink">
                    {!row.uploadedAt ? (
                      <span className="rounded-md bg-field px-2 py-1 text-xs text-gray-600">주유 {row.fuelLevel}%</span>
                    ) : (
                      row.uploadedAt
                    )}
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-700">{row.damagedVehicle}</td>
                  <td className="px-4 py-3 font-semibold text-gray-700">{row.ordererAndRepairShop}</td>
                  <td className="px-4 py-3">
                    {row.intakeType ? (
                      <span className={`rounded-md px-2 py-1 text-xs font-black ${getIntakeTypeClass(row.intakeType)}`}>
                        {formatIntakeType(row.intakeType)}
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-gray-400">-</span>
                    )}
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

function formatDamagedVehicle(vehicleNumber: string, model: string) {
  const normalizedVehicleNumber = vehicleNumber.trim();
  const normalizedModel = model.trim();

  if (!normalizedVehicleNumber || normalizedVehicleNumber === "-") return normalizedModel || "-";
  if (!normalizedModel || normalizedModel === "-") return normalizedVehicleNumber;

  return `${normalizedVehicleNumber} / ${normalizedModel}`;
}

function formatIntakeType(value: string) {
  if (value === "selfPay") return "자차";
  if (value === "selfService") return "셀프";
  return "보험";
}

function getIntakeTypeClass(value: string) {
  if (value === "selfPay") return "bg-emerald-100 text-emerald-700";
  if (value === "selfService") return "bg-blue-100 text-blue-700";
  return "bg-red-100 text-red-700";
}

function formatOrdererAndRepairShop(dispatch: { orderedBy: string; repairShop: string; customerName: string; intakeType?: string }) {
  if (dispatch.intakeType === "selfService") {
    return normalizeDispatchCellValue(dispatch.customerName) || "?";
  }

  const normalizedOrderer = normalizeDispatchCellValue(dispatch.orderedBy);
  const normalizedRepairShop = normalizeDispatchCellValue(dispatch.repairShop);

  return `${normalizedOrderer || "?"}/${normalizedRepairShop || "?"}`;
}

function normalizeDispatchCellValue(value: string) {
  const trimmed = value.trim();

  return trimmed && trimmed !== "-" && trimmed !== "확인필요" ? trimmed : "";
}
