"use client";

import { AccidentHistoryBoard, MaintenanceHistoryBoard } from "@/components/erp/HistoryBoards";
import { useERPState } from "@/lib/erp-state";
import { isVehicleNumberMatch } from "@/lib/vehicle-utils";

export function VehicleDetailStateSections({ plateNumber }: { plateNumber: string }) {
  const { uploadedFiles, dispatches, returns, maintenanceHistories, accidentHistories, isLoaded } = useERPState();

  if (!isLoaded) {
    return <div className="rounded-lg bg-white p-5 text-sm font-bold text-gray-500">차량 기록을 불러오는 중입니다...</div>;
  }

  const vehicleUploads = uploadedFiles.filter((item) =>
    [item.vehicleNumber, item.fileName, item.r2Key, item.driveFileId].some((value) => isVehicleNumberMatch(value, plateNumber)),
  );
  const vehicleDispatches = dispatches.filter((item) => isVehicleNumberMatch(item.rentalCarNumber, plateNumber));
  const vehicleReturns = returns.filter((item) => isVehicleNumberMatch(item.rentalCarNumber, plateNumber));
  const vehicleMaintenanceCount = maintenanceHistories.filter((item) => item.plateNumber === plateNumber).length;
  const vehicleAccidentCount = accidentHistories.filter((item) => item.plateNumber === plateNumber).length;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-5">
        <Metric label="업로드 파일" value={`${vehicleUploads.length}건`} />
        <Metric label="배차" value={`${vehicleDispatches.length}건`} />
        <Metric label="회차" value={`${vehicleReturns.length}건`} />
        <Metric label="정비이력" value={`${vehicleMaintenanceCount}건`} />
        <Metric label="사고이력" value={`${vehicleAccidentCount}건`} />
      </div>

      <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
        <h2 className="text-lg font-black text-ink">업로드 파일</h2>
        <div className="mt-4 grid gap-3">
          {vehicleUploads.map((item) => (
            <article key={item.r2Key || item.driveFileId || item.fileName} className="rounded-lg bg-field p-3">
              <p className="break-all text-sm font-black text-primary">{item.fileName}</p>
              <p className="mt-1 break-all text-xs font-semibold text-gray-500">
                {item.uploadedAt} · R2 {item.r2Key || "없음"} · Drive {item.driveBackupStatus}
              </p>
            </article>
          ))}
          {vehicleUploads.length === 0 && <Empty text="차량번호 기준 업로드 파일이 없습니다." />}
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <RecordList
          title="배차이력"
          emptyText="배차 기록이 없습니다."
          items={vehicleDispatches.map((item) => ({
            id: item.id,
            title: `${item.rentalCarNumber} · ${item.customerName}`,
            description: `${item.claimNumber} / ${item.repairShop} / ${item.status}`,
          }))}
        />
        <RecordList
          title="회차이력"
          emptyText="회차 기록이 없습니다."
          items={vehicleReturns.map((item) => ({
            id: item.id,
            title: `${item.rentalCarNumber} 회차`,
            description: `${item.returnAddress} -> ${item.arrivalAddress} / ${item.status} / ${item.mileage.toLocaleString()}km`,
          }))}
        />
      </div>

      <MaintenanceHistoryBoard plateNumber={plateNumber} />
      <AccidentHistoryBoard plateNumber={plateNumber} />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-lg border border-line bg-white p-4 shadow-sm">
      <p className="text-xs font-bold text-gray-500">{label}</p>
      <p className="mt-2 text-xl font-black text-ink">{value}</p>
    </article>
  );
}

function RecordList({
  title,
  emptyText,
  items,
}: {
  title: string;
  emptyText: string;
  items: Array<{ id: string; title: string; description: string }>;
}) {
  return (
    <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
      <h2 className="text-lg font-black text-ink">{title}</h2>
      <div className="mt-4 grid gap-3">
        {items.map((item) => (
          <article key={item.id} className="rounded-lg bg-field p-3">
            <p className="text-sm font-black text-primary">{item.title}</p>
            <p className="mt-1 text-sm font-semibold text-gray-700">{item.description}</p>
          </article>
        ))}
        {items.length === 0 && <Empty text={emptyText} />}
      </div>
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-lg bg-field p-4 text-center text-sm font-bold text-gray-500">{text}</div>;
}
