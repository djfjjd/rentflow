import { UniversalAiIntake } from "@/components/UniversalAiIntake";
import { AdminShell } from "@/components/erp/Shell";
import { adminNavItems } from "@/lib/erp-data";

export default function Home() {
  return (
    <AdminShell title="렌터카 사고대차 관리 플랫폼 RentFlow" description="사진, 면허증, 보험접수자료, 특이사항을 한 번에 접수하고 Google Drive 문서로 저장합니다." navItems={adminNavItems}>
      <section>
        <UniversalAiIntake />
      </section>
    </AdminShell>
  );
}
