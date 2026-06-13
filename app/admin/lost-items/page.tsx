import { AdminShell } from "@/components/erp/Shell";
import { adminNavItems } from "@/lib/erp-data";

const lostItems: Array<{ id: string; vehicleNumber: string; title: string; location: string; status: string; reportedAt: string }> = [];

export default function LostItemsPage() {
  return (
    <AdminShell title="분실물관리" description="회차 후 발견된 분실물 접수, 보관 위치, 처리 상태를 확인합니다." navItems={adminNavItems}>
      <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-black text-ink">분실물 목록</h2>
          <input placeholder="차량번호, 물품명, 보관위치 검색" className="min-h-11 rounded-lg border border-line px-3 text-sm outline-none" />
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-line text-xs text-gray-500">
              <tr>
                <th className="py-3">접수일</th>
                <th>차량번호</th>
                <th>물품</th>
                <th>보관위치</th>
                <th>상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {lostItems.map((item) => (
                <tr key={item.id}>
                  <td className="py-3 font-semibold text-gray-700">{item.reportedAt}</td>
                  <td className="font-black text-primary">{item.vehicleNumber}</td>
                  <td className="font-semibold text-ink">{item.title}</td>
                  <td>{item.location}</td>
                  <td><span className="rounded-md bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">{item.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {lostItems.length === 0 && <div className="mt-4 rounded-lg bg-field p-5 text-center text-sm font-bold text-gray-500">등록된 분실물이 없습니다.</div>}
      </section>
    </AdminShell>
  );
}
