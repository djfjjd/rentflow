import { AdminShell } from "@/components/erp/Shell";
import { PartnerManager } from "@/components/erp/PartnerManager";
import { adminNavItems } from "@/lib/erp-data";

export default function FactoriesPage() {
  return (
    <AdminShell title="공장관리" description="배차/회차/예약에서 자주 사용하는 정비공장과 공업사를 관리합니다." navItems={adminNavItems}>
      <PartnerManager title="공장 목록" allowedTypes={["정비공장", "공업사"]} />
    </AdminShell>
  );
}
