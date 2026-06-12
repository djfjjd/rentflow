import { CorporateCardManager } from "@/components/erp/CorporateCardManager";
import { AdminShell } from "@/components/erp/Shell";
import { adminNavItems } from "@/lib/erp-data";

export default function CorporateCardsPage() {
  return (
    <AdminShell title="법인카드 관리" description="법인카드와 사용내역을 등록하고 CSV/엑셀 업로드, mock API 조회, 차량/거래처/정비이력 자동 연결을 관리합니다." navItems={adminNavItems}>
      <CorporateCardManager />
    </AdminShell>
  );
}
