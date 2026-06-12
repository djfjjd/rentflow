import { DriverAssignmentManager } from "@/components/erp/DriverAssignmentManager";
import { AdminShell } from "@/components/erp/Shell";
import { adminNavItems } from "@/lib/erp-data";

export default function DriverAssignmentsPage() {
  return (
    <AdminShell title="운전자 배정" description="배차, 회차, 탁송, 정비입고/출고 담당자를 배정하고 출발/도착/전달/회차 완료 시간을 기록합니다." navItems={adminNavItems}>
      <DriverAssignmentManager />
    </AdminShell>
  );
}
