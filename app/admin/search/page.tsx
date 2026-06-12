import Link from "next/link";
import { DriveFileList } from "@/components/DriveFileList";
import { AdminShell } from "@/components/erp/Shell";
import { adminNavItems, dispatches, vehicles } from "@/lib/erp-data";

export default function SearchPage() {
  return (
    <AdminShell title="통합검색" description="차량, 보험접수번호, 고객명, 서류와 구글드라이브 파일을 하나의 검색 화면에서 확인합니다." navItems={adminNavItems}>
      <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
        <input placeholder="차량번호, 고객명, 보험접수번호 검색" className="min-h-12 w-full rounded-lg border border-line px-4" />
        <div className="mt-5 grid gap-3">
          <Link href={`/admin/vehicles/${vehicles[0].id}`} className="rounded-lg bg-field p-4 font-bold text-primary">
            차량 · {vehicles[0].plateNumber}
          </Link>
          <div className="rounded-lg bg-field p-4 font-bold text-ink">
            보험접수 · {dispatches[0].claimNumber} · {dispatches[0].customerName}
          </div>
        </div>
      </section>
      <div className="mt-5">
        <DriveFileList initialQuery={vehicles[0].plateNumber} />
      </div>
    </AdminShell>
  );
}
