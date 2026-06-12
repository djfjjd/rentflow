import { AdminShell } from "@/components/erp/Shell";
import { DispatchManager } from "@/components/erp/DispatchReturnManagers";
import { adminNavItems } from "@/lib/erp-data";

export default function DispatchesPage() {
  return (
    <AdminShell title="배차관리" description="배차 등록 필드, 사진/영상 첨부, 자동 배차보고/출발보고/도착보고 복사를 제공합니다." navItems={adminNavItems}>
      <DispatchManager />
    </AdminShell>
  );
}
