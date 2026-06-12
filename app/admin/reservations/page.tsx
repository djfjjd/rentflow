import { AdminShell } from "@/components/erp/Shell";
import { ReservationBoard } from "@/components/erp/ReservationMaintenanceDocuments";
import { adminNavItems } from "@/lib/erp-data";

export default function ReservationsPage() {
  return (
    <AdminShell title="예약 캘린더" description="예약일정을 캘린더 형태와 리스트 형태로 동시에 확인합니다." navItems={adminNavItems}>
      <ReservationBoard />
    </AdminShell>
  );
}
