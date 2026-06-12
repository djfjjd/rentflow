import { RevenueBoard } from "@/components/erp/HistoryBoards";
import { AdminShell } from "@/components/erp/Shell";
import { adminNavItems } from "@/lib/erp-data";

export default function RevenuePage() {
  return (
    <AdminShell title="차량별 매출분석" description="월간 매출, 비용, 순이익, 수익률, 배차건수, 대여일수를 차량별로 분석합니다." navItems={adminNavItems}>
      <RevenueBoard />
    </AdminShell>
  );
}
