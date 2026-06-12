import { AdminShell } from "@/components/erp/Shell";
import { PartnerManager } from "@/components/erp/PartnerManager";
import { adminNavItems } from "@/lib/erp-data";

export default function PartnersPage() {
  return (
    <AdminShell title="거래처관리" description="정비공장, 공업사, 보험사, 렌터카업체, 탁송거점, 일반 거래처의 연락처와 주소를 관리합니다." navItems={adminNavItems}>
      <PartnerManager />
    </AdminShell>
  );
}
