import { AdminShell } from "@/components/erp/Shell";
import { MaintenanceBoard } from "@/components/erp/ReservationMaintenanceDocuments";
import { adminNavItems } from "@/lib/erp-data";

export default function MaintenancePage() {
  return (
    <AdminShell title="정비관리" description="차량 운행 상태와 회차 완료 이벤트를 기준으로 정비대기 알림을 관리합니다." navItems={adminNavItems}>
      <MaintenanceBoard />
    </AdminShell>
  );
}
