import Link from "next/link";
import { PartnerHistory } from "@/components/erp/PartnerManager";
import { AdminShell } from "@/components/erp/Shell";
import { adminNavItems, partners } from "@/lib/erp-data";

export function generateStaticParams() {
  return partners.map((partner) => ({ id: partner.id }));
}

export default async function PartnerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const partner = partners.find((item) => item.id === id) ?? partners[0];

  return (
    <AdminShell title={`${partner.name} 상세`} description="거래처 기본 정보와 차량번호/보험접수번호로 연결된 공장 이력을 확인합니다." navItems={adminNavItems}>
      <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
        <Link href="/admin/partners" className="text-sm font-bold text-primary">거래처 목록으로</Link>
        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <Info label="유형" value={partner.type} />
          <Info label="지역" value={partner.region} />
          <Info label="담당자" value={partner.managerName} />
          <Info label="연락처" value={partner.phone || partner.mobile} />
        </div>
        <div className="mt-4 rounded-lg bg-field p-4">
          <p className="font-bold text-ink">{partner.address} {partner.detailAddress}</p>
          <p className="mt-2 text-sm leading-6 text-gray-600">{partner.memo}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a href={`tel:${partner.phone || partner.mobile}`} className="rounded-md bg-white px-3 py-2 text-xs font-bold">전화걸기</a>
            <a href={`https://map.naver.com/p/search/${encodeURIComponent(`${partner.name} ${partner.address}`)}`} target="_blank" rel="noreferrer" className="rounded-md bg-white px-3 py-2 text-xs font-bold">네이버지도</a>
            <a href={`https://map.kakao.com/link/search/${encodeURIComponent(`${partner.name} ${partner.address}`)}`} target="_blank" rel="noreferrer" className="rounded-md bg-white px-3 py-2 text-xs font-bold">카카오맵</a>
            <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${partner.name} ${partner.address}`)}`} target="_blank" rel="noreferrer" className="rounded-md bg-white px-3 py-2 text-xs font-bold">구글지도</a>
          </div>
        </div>
      </section>
      <div className="mt-5">
        <PartnerHistory partnerId={partner.id} />
      </div>
    </AdminShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-field p-4">
      <p className="text-xs font-bold text-gray-500">{label}</p>
      <p className="mt-2 text-lg font-black text-ink">{value}</p>
    </div>
  );
}
