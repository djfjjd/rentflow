import { MobileAppShell } from "@/components/erp/Shell";
import { appNavItems, dispatches, maintenanceItems, reservations, returns } from "@/lib/erp-data";

export default function AppTasksPage() {
  const tasks = [
    dispatches[0] ? `배차보고 필요 · ${dispatches[0].rentalCarNumber}` : "",
    returns[0] ? `회차보고 필요 · ${returns[0].rentalCarNumber}` : "",
    maintenanceItems[1] ? `정비대기 알림 · ${maintenanceItems[1].vehicleNumber}` : "",
  ].filter(Boolean);

  return (
    <MobileAppShell title="내 업무" description="오늘 현장 직원에게 배정된 업무만 크게 보여줍니다." navItems={appNavItems}>
      <div className="space-y-3">
        {tasks.map((task) => (
          <article key={task} className="rounded-lg border border-line bg-white p-5 shadow-sm">
            <p className="text-lg font-black text-ink">{task}</p>
            {reservations[0] && <p className="mt-2 text-sm text-gray-500">관련 예약 {reservations[0].date} {reservations[0].time}</p>}
          </article>
        ))}
        {tasks.length === 0 && <div className="rounded-lg border border-line bg-white p-5 text-sm font-bold text-gray-500">배정된 업무가 없습니다.</div>}
      </div>
    </MobileAppShell>
  );
}
