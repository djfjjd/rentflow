import { MobileAppShell } from "@/components/erp/Shell";
import { ReportTools } from "@/components/erp/ReportTools";
import { appNavItems, returns } from "@/lib/erp-data";

export default function AppReturnPage() {
  return (
    <MobileAppShell title="회차보고" description="회차보고, 출발보고, 도착보고를 자동 생성하고 복사합니다." navItems={appNavItems}>
      <ReportTools type="return" record={returns[0]} />
    </MobileAppShell>
  );
}
