"use client";

import { useERPState } from "@/lib/erp-state";
import { formatParkingLocation, isVehicleNumberMatch } from "@/lib/vehicle-utils";
import { AutoReturnProcessBoard } from "./HistoryBoards";

export function VehicleStatusBoard() {
  const { vehicles, dispatches, uploadedFiles, isLoaded } = useERPState();

  const boardRows = vehicles.map((vehicle) => {
    const vehicleDispatches = dispatches.filter((item) => isVehicleNumberMatch(item.rentalCarNumber, vehicle.plateNumber));
    const latestDispatch = vehicleDispatches[0];
    const latestUpload = uploadedFiles.find((item) =>
      [item.vehicleNumber, item.fileName, item.r2Key, item.driveFileId].some((value) => isVehicleNumberMatch(value, vehicle.plateNumber)),
    );
    const latestUploadedAt = latestDispatch?.uploadedAt || latestUpload?.uploadedAt || "";
    
    // If vehicle is in Accident or Maintenance, show that info even if there's no dispatch
    const repairShopOrParking = formatParkingLocation(latestDispatch?.repairShop || vehicle.location) || latestDispatch?.repairShop || vehicle.location;

    return {
      id: vehicle.id,
      vehicleNumber: vehicle.plateNumber,
      status: vehicle.status,
      customerPhone: latestDispatch?.customerPhone || "-",
      uploadedAt: latestUploadedAt ? new Date(latestUploadedAt).toLocaleDateString("ko-KR") : "",
      fuelLevel: latestDispatch?.fuelLevel ?? vehicle.fuelLevel,
      damagedVehicle: latestDispatch ? formatDamagedVehicle(latestDispatch.customerCarNumber, latestDispatch.customerCarModel) : "-",
      ordererAndRepairShop: latestDispatch ? formatOrdererAndRepairShop(latestDispatch) : repairShopOrParking,
      intakeType: latestDispatch?.intakeType || latestUpload?.intakeType || (latestDispatch || latestUpload ? "insurance" : ""),
    };
  });

  if (!isLoaded) return <div className="p-10 text-center text-sm font-bold text-gray-500">데이터를 불러오는 중입니다...</div>;

  return (
    <section className="overflow-hidden rounded-lg border border-line bg-white shadow-sm">
      <div className="border-b border-line px-5 py-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-ink">차량 현황판</h2>
          <p className="mt-1 text-sm text-gray-500">전체 차량을 기준으로 표시하고, 배차 업로드가 있으면 최신 정보를 보여줍니다.</p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[920px] w-full border-collapse text-left text-sm">
          <thead className="bg-field text-xs font-black text-gray-500">
            <tr>
              <th className="px-4 py-3">차량번호</th>
              <th className="px-4 py-3">상태</th>
              <th className="px-4 py-3">연락처</th>
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
                <td className="px-4 py-3">
                  <span className={`rounded-md px-2 py-1 text-[10px] font-black ${getStatusClass(row.status)}`}>
                    {row.status}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium text-gray-600">{row.customerPhone}</td>
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
  );
}

function formatDamagedVehicle(vehicleNumber: string, model: string) {
  const normalizedVehicleNumber = (vehicleNumber || "").trim();
  const normalizedModel = (model || "").trim();

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

function getStatusClass(status: string) {
  switch (status) {
    case "배차중": return "bg-primary text-white";
    case "대기중": return "bg-emerald-100 text-emerald-700";
    case "사고": return "bg-red-100 text-red-700";
    case "정비필요": return "bg-amber-100 text-amber-700";
    default: return "bg-gray-100 text-gray-600";
  }
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
  const trimmed = (value || "").trim();

  return trimmed && trimmed !== "-" && trimmed !== "확인필요" ? trimmed : "";
}
