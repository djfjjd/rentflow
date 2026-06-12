import { MobileAppShell } from "@/components/erp/Shell";
import { appNavItems, reservations } from "@/lib/erp-data";

export default function AppSchedulePage() {
  return (
    <MobileAppShell title="오늘 일정" description="배차, 회차, 정비 대기 일정을 시간순으로 확인합니다." navItems={appNavItems}>
      <div className="space-y-3">
        {reservations.map((item) => (
          <article key={item.id} className="rounded-lg border border-line bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xl font-black text-primary">{item.time}</p>
              <span className="rounded-md bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">{item.status}</span>
            </div>
            <p className="mt-3 text-lg font-black text-ink">{item.customerName} · {item.vehicleNumber}</p>
            <p className="mt-1 text-sm text-gray-500">{item.route}</p>
          </article>
        ))}
      </div>
    </MobileAppShell>
  );
}
