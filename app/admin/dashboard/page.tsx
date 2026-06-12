import { AdminShell, StatCard } from "@/components/erp/Shell";
import { getThisMonthCardExpense } from "@/lib/corporate-card-data";
import { getReceivableSummary } from "@/lib/finance-ops-data";
import { adminNavItems, dispatches, maintenanceItems, reservations, vehicleRevenues, vehicles } from "@/lib/erp-data";

export default function AdminDashboardPage() {
  const receivableSummary = getReceivableSummary();

  return (
    <AdminShell title="전체 대시보드" description="모바일 앱에서 들어온 접수, 배차, 회차, 정비, 법인카드 비용을 한 화면에서 관리합니다." navItems={adminNavItems}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="차량" value={`${vehicles.length}`} hint="공유 DB vehicles" />
        <StatCard label="진행 배차" value={`${dispatches.length}`} hint="dispatches + reports" />
        <StatCard label="예약 일정" value={`${reservations.length}`} hint="calendar/list" />
        <StatCard label="정비 대기" value={`${maintenanceItems.length}`} hint="운행중 대기 포함" />
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="이번달 총매출" value={`${sum("totalRevenue").toLocaleString()}원`} hint="차량별 매출분석" />
        <StatCard label="이번달 총비용" value={`${(sum("totalCost") + getThisMonthCardExpense()).toLocaleString()}원`} hint="법인카드 지출 포함" />
        <StatCard label="이번달 순이익" value={`${(sum("netProfit") - getThisMonthCardExpense()).toLocaleString()}원`} hint="매출 - 비용 - 카드지출" />
        <StatCard label="이번달 법인카드 지출" value={`${getThisMonthCardExpense().toLocaleString()}원`} hint="CSV/API/수동 등록" />
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="총 미수금" value={`${receivableSummary.totalRemaining.toLocaleString()}원`} hint="remaining amount" />
        <StatCard label="입금대기" value={`${receivableSummary.waiting.toLocaleString()}원`} hint="due tracking" />
        <StatCard label="부분입금" value={`${receivableSummary.partial.toLocaleString()}원`} hint="partial payment" />
        <StatCard label="장기미수" value={`${receivableSummary.overdue.toLocaleString()}원`} hint="30일 초과" />
        <StatCard label="이번달 입금액" value={`${receivableSummary.thisMonthPaid.toLocaleString()}원`} hint="payments" />
      </div>
      <section className="mt-5 rounded-lg border border-line bg-white p-5 shadow-sm">
        <h2 className="text-lg font-black text-ink">권한 구조</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <RoleCard role="admin" body="관리자 사이트 전체 접근, 법인카드/정산/매출분석 관리" />
          <RoleCard role="staff" body="모바일 앱 전체 접근, 일부 관리자 기능 접근" />
          <RoleCard role="driver" body="모바일 앱의 배정 업무와 보고 기능만 접근" />
        </div>
      </section>
    </AdminShell>
  );
}

function sum(key: "totalRevenue" | "totalCost" | "netProfit") {
  return vehicleRevenues.reduce((total, item) => total + item[key], 0);
}

function RoleCard({ role, body }: { role: string; body: string }) {
  return (
    <article className="rounded-lg bg-field p-4">
      <p className="text-base font-black text-primary">{role}</p>
      <p className="mt-2 text-sm leading-6 text-gray-600">{body}</p>
    </article>
  );
}
