import { AdminShell } from "@/components/erp/Shell";
import { PartnerManager } from "@/components/erp/PartnerManager";
import { adminNavItems } from "@/lib/erp-data";

export default function InsurersPage() {
  return (
    <AdminShell title="보험사관리" description="보험사, 보상센터, 담당자 연락처와 사업자 정보를 관리합니다." navItems={adminNavItems}>
      <PartnerManager title="보험사 목록" allowedTypes={["보험사"]} />
    </AdminShell>
  );
}
