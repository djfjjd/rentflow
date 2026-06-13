import { MobileAppShell } from "@/components/erp/Shell";
import { ReportTools } from "@/components/erp/ReportTools";
import { appNavItems, returns } from "@/lib/erp-data";

export default function AppReturnPage() {
  return (
    <MobileAppShell title="회차보고" description="회차보고, 출발보고, 도착보고를 자동 생성하고 복사합니다." navItems={appNavItems}>
      {returns[0] ? <ReportTools type="return" record={returns[0]} /> : <div className="rounded-lg border border-line bg-white p-5 text-sm font-bold text-gray-500">회차 기록이 없습니다.</div>}
    </MobileAppShell>
  );
}
