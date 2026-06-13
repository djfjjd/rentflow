import { MobileAppShell } from "@/components/erp/Shell";
import { ReportTools } from "@/components/erp/ReportTools";
import { appNavItems, dispatches } from "@/lib/erp-data";

export default function AppDispatchPage() {
  return (
    <MobileAppShell title="배차보고" description="현장에서 배차보고, 출발보고, 도착보고를 자동 생성합니다." navItems={appNavItems}>
      {dispatches[0] ? <ReportTools type="dispatch" record={dispatches[0]} /> : <div className="rounded-lg border border-line bg-white p-5 text-sm font-bold text-gray-500">배차 기록이 없습니다.</div>}
    </MobileAppShell>
  );
}
