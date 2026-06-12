import { AdminShell } from "@/components/erp/Shell";
import { adminNavItems } from "@/lib/erp-data";

const tables = [
  "app_profiles",
  "vehicles",
  "dispatches",
  "returns",
  "reports",
  "reservations",
  "maintenance_jobs",
  "documents",
  "attachments",
];

export default function SettingsPage() {
  return (
    <AdminShell title="설정" description="Supabase Auth, Database, Storage, PWA 설정 연결 지점을 정리합니다." navItems={adminNavItems}>
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-ink">공유 Supabase 테이블</h2>
          <div className="mt-4 grid gap-2">
            {tables.map((table) => (
              <code key={table} className="rounded-lg bg-field px-3 py-2 text-sm font-bold text-primary">{table}</code>
            ))}
          </div>
        </section>
        <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-ink">스토리지 버킷</h2>
          <p className="mt-3 rounded-lg bg-field p-4 text-sm leading-6 text-gray-600">
            `erp-attachments` 버킷에 사진, 영상, 서류 파일을 저장하고 `attachments` 테이블에서 배차/회차/문서와 연결합니다.
          </p>
          <h2 className="mt-5 text-lg font-black text-ink">PWA</h2>
          <p className="mt-3 rounded-lg bg-field p-4 text-sm leading-6 text-gray-600">
            manifest와 service worker를 확장해 현장 직원용 홈 화면 설치, 카메라 촬영, 오프라인 임시 저장을 붙이는 구조입니다.
          </p>
        </section>
      </div>
    </AdminShell>
  );
}
