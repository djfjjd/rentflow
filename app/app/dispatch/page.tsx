import { MobileAppShell } from "@/components/erp/Shell";
import { ReportTools } from "@/components/erp/ReportTools";
import { appNavItems, dispatches } from "@/lib/erp-data";

export default function AppDispatchPage() {
  return (
    <MobileAppShell title="배차보고" description="현장에서 배차보고, 출발보고, 도착보고를 자동 생성합니다." navItems={appNavItems}>
      <ReportTools type="dispatch" record={dispatches[0]} />
    </MobileAppShell>
  );
}
