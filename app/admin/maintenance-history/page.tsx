import { AccidentHistoryBoard, MaintenanceHistoryBoard } from "@/components/erp/HistoryBoards";
import { MaintenanceBoard } from "@/components/erp/ReservationMaintenanceDocuments";
import { AdminShell } from "@/components/erp/Shell";
import { adminNavItems } from "@/lib/erp-data";

export default function MaintenanceHistoryPage() {
  return (
    <AdminShell title="사고, 정비기록" description="정비관리, 정비이력, 사고이력을 한 화면에서 확인합니다." navItems={adminNavItems}>
      <div className="space-y-5">
        <MaintenanceBoard />
        <MaintenanceHistoryBoard />
        <AccidentHistoryBoard />
      </div>
    </AdminShell>
  );
}
