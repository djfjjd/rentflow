import { AccidentHistoryBoard } from "@/components/erp/HistoryBoards";
import { AdminShell } from "@/components/erp/Shell";
import { adminNavItems } from "@/lib/erp-data";

export default function AccidentHistoryPage() {
  return (
    <AdminShell title="사고이력" description="차량번호, 보험접수번호, 사고부위, 보험사별로 사고이력을 관리합니다." navItems={adminNavItems}>
      <AccidentHistoryBoard />
    </AdminShell>
  );
}
