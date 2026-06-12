import { PartnerDocumentAssist } from "@/components/erp/PartnerDocumentAssist";
import { AdminShell } from "@/components/erp/Shell";
import { adminNavItems } from "@/lib/erp-data";

export default function TaxInvoicesPage() {
  return (
    <AdminShell title="세금계산서관리" description="거래처 선택 시 사업자정보를 자동 입력하는 세금계산서 작성 구조입니다." navItems={adminNavItems}>
      <PartnerDocumentAssist mode="tax" />
    </AdminShell>
  );
}
