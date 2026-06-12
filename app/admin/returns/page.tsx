import { AdminShell } from "@/components/erp/Shell";
import { ReturnManager } from "@/components/erp/DispatchReturnManagers";
import { adminNavItems } from "@/lib/erp-data";

export default function ReturnsPage() {
  return (
    <AdminShell title="회차관리" description="회차 등록 필드, 사진/영상 첨부, 자동 회차보고/출발보고/도착보고 복사를 제공합니다." navItems={adminNavItems}>
      <ReturnManager />
    </AdminShell>
  );
}
