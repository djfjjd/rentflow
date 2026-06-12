import { AdminShell } from "@/components/erp/Shell";
import { driverAssignments, drivers } from "@/lib/finance-ops-data";
import { adminNavItems } from "@/lib/erp-data";

export default function StaffPage() {
  return (
    <AdminShell title="직원관리" description="Supabase Auth 사용자와 app_profiles.role 권한, 직원별 배차/회차 수행 이력을 관리합니다." navItems={adminNavItems}>
      <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
        <div className="grid gap-3 md:grid-cols-3">
          {drivers.map((driver) => {
            const items = driverAssignments.filter((item) => item.driverId === driver.id);
            return (
              <article key={driver.id} className="rounded-lg bg-field p-4">
                <p className="text-lg font-black text-ink">{driver.name}</p>
                <p className="mt-1 text-sm font-bold text-primary">{driver.phone}</p>
                <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  <Metric label="배차 수행" value={`${items.filter((item) => item.assignmentType === "배차").length}건`} />
                  <Metric label="회차 수행" value={`${items.filter((item) => item.assignmentType === "회차").length}건`} />
                  <Metric label="고객 전달" value={`${items.filter((item) => item.status === "고객전달완료").length}건`} />
                  <Metric label="총 이동" value={`${items.length}건`} />
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </AdminShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white p-3">
      <p className="text-xs font-bold text-gray-500">{label}</p>
      <p className="mt-1 font-black text-ink">{value}</p>
    </div>
  );
}
