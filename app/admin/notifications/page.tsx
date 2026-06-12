import { NotificationCenter } from "@/components/erp/HistoryBoards";
import { AdminShell } from "@/components/erp/Shell";
import { adminNavItems } from "@/lib/erp-data";

export default function NotificationsPage() {
  return (
    <AdminShell title="알림센터" description="예약 하루 전, 1시간 전, 정각 알림과 정비/청구 알림을 mock으로 관리합니다." navItems={adminNavItems}>
      <NotificationCenter />
    </AdminShell>
  );
}
