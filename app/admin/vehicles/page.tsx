import { AdminShell } from "@/components/erp/Shell";
import { VehicleManager } from "@/components/erp/VehicleManager";
import { adminNavItems } from "@/lib/erp-data";

export default function VehiclesPage() {
  return (
    <AdminShell title="차량관리" description="차량 등록, 수정, 삭제, 검색을 수행하고 차량번호 클릭 시 상세 이력으로 이동합니다." navItems={adminNavItems}>
      <VehicleManager />
    </AdminShell>
  );
}
