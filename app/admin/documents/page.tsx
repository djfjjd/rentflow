import { AdminShell } from "@/components/erp/Shell";
import { DocumentCenter } from "@/components/erp/ReservationMaintenanceDocuments";
import { adminNavItems } from "@/lib/erp-data";

export default function DocumentsPage() {
  return (
    <AdminShell title="서류센터" description="계약서, 청구서, 세금계산서, 증명서, 정비/거래 서류를 등록하고 브라우저 print 기반 PDF 저장을 지원합니다." navItems={adminNavItems}>
      <DocumentCenter />
    </AdminShell>
  );
}
