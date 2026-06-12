import { ReceivableManager } from "@/components/erp/ReceivableManager";
import { AdminShell } from "@/components/erp/Shell";
import { adminNavItems } from "@/lib/erp-data";

export default function ReceivablesPage() {
  return (
    <AdminShell title="미수금 관리" description="청구 후 입금 상태, 부분입금, 장기미수, 잔액을 테이블 중심으로 관리합니다." navItems={adminNavItems}>
      <ReceivableManager />
    </AdminShell>
  );
}
