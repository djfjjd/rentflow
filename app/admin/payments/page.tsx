import { ReceivableManager } from "@/components/erp/ReceivableManager";
import { AdminShell } from "@/components/erp/Shell";
import { adminNavItems } from "@/lib/erp-data";

export default function PaymentsPage() {
  return (
    <AdminShell title="입금 관리" description="입금 등록, 부분입금 처리, 입금확인서 PDF 출력을 관리합니다." navItems={adminNavItems}>
      <ReceivableManager />
    </AdminShell>
  );
}
