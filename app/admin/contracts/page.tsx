import { AdminPlaceholder } from "@/components/erp/AdminPlaceholder";
import { AdminShell } from "@/components/erp/Shell";
import { adminNavItems } from "@/lib/erp-data";

export default function ContractsPage() {
  return (
    <AdminShell title="계약서관리" description="서류센터의 계약서 타입과 연결되는 관리자 화면입니다." navItems={adminNavItems}>
      <AdminPlaceholder moduleName="계약서관리" />
    </AdminShell>
  );
}
