import { BillingCalculatorPanel } from "@/components/erp/BillingCalculatorPanel";
import { PartnerDocumentAssist } from "@/components/erp/PartnerDocumentAssist";
import { ReceivableManager } from "@/components/erp/ReceivableManager";
import { AdminShell } from "@/components/erp/Shell";
import { adminNavItems } from "@/lib/erp-data";

export default function BillingPage() {
  return (
    <AdminShell title="청구서관리" description="청구금액 계산기, 거래처 자동완성, 미수금 상태와 입금내역을 한 화면에서 관리합니다." navItems={adminNavItems}>
      <div className="space-y-5">
        <BillingCalculatorPanel />
        <PartnerDocumentAssist mode="billing" />
        <ReceivableManager />
      </div>
    </AdminShell>
  );
}
