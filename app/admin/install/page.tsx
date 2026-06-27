import { AdminShell } from "@/components/erp/Shell";
import { InstallGuideClient } from "@/components/install/InstallGuideClient";
import { adminNavItems } from "@/lib/erp-data";

const fallbackAppUrl = "https://rentflow-9yg.pages.dev/";

export default function AdminInstallPage() {
  const appUrl = normalizeAppUrl(process.env.NEXT_PUBLIC_APP_URL || fallbackAppUrl);

  return (
    <AdminShell title="렌트플로우 설치" description="QR코드로 RentFlow를 설치합니다." navItems={adminNavItems}>
      <InstallGuideClient appUrl={appUrl} />
    </AdminShell>
  );
}

function normalizeAppUrl(value: string) {
  const trimmed = value.trim() || fallbackAppUrl;
  return trimmed.endsWith("/") ? trimmed : `${trimmed}/`;
}
