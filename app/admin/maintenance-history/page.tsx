import { MaintenanceHistoryBoard } from "@/components/erp/HistoryBoards";
import { AdminShell } from "@/components/erp/Shell";
import { adminNavItems } from "@/lib/erp-data";

export default function MaintenanceHistoryPage() {
  return (
    <AdminShell title="정비이력" description="차량번호, 정비업체, 날짜별로 정비이력을 조회하고 비용 합계를 확인합니다." navItems={adminNavItems}>
      <MaintenanceHistoryBoard />
    </AdminShell>
  );
}
