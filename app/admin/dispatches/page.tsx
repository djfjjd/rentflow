import { AdminShell } from "@/components/erp/Shell";
import { DispatchReturnManager } from "@/components/erp/DispatchReturnManagers";
import { adminNavItems } from "@/lib/erp-data";

export default function DispatchesPage() {
  return (
    <AdminShell title="배회차관리" description="AI 접수로 생성된 배차와 회차 기록을 한 화면에서 확인합니다." navItems={adminNavItems}>
      <DispatchReturnManager />
    </AdminShell>
  );
}
