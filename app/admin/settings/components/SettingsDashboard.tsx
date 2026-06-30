"use client";

import { useState } from "react";
import { BackupPanel } from "./BackupPanel";
import { CompanyPanel } from "./CompanyPanel";
import { DevicePanel } from "./DevicePanel";
import { LoginHistoryPanel } from "./LoginHistoryPanel";
import { NotificationPanel } from "./NotificationPanel";
import { RolePanel } from "./RolePanel";
import { SettingsSidebar } from "./SettingsSidebar";
import { StaffPanel } from "./StaffPanel";
import { SystemPanel } from "./SystemPanel";
import type { SettingsSection } from "./settings-menu";

export function SettingsDashboard() {
  const [active, setActive] = useState<SettingsSection>("staff");

  return (
    <section className="space-y-4">
      <header className="panel">
        <h1 className="text-2xl font-black">관리자 설정센터</h1>
        <p className="mt-2 whitespace-pre-line text-sm font-bold leading-6 text-[#68746d]">
          {"1. 직원관리에서 이름 이메일 직책을 설정하고 추가해주세요.\n2. 어플 설치 후 초기화면에서 로그인 해주세요 직원(4321) > 이름 이메일 인증\n3. 기기관리에서 해당 기기를 승인해주세요\n- 퇴사 시 직원관리와 기기관리에서 삭제하기"}
        </p>
      </header>

      <section className="flex flex-col gap-4 md:flex-row md:items-start">
        <SettingsSidebar active={active} onChange={setActive} />
        <div className="min-w-0 flex-1">
          {active === "staff" ? <StaffPanel /> : null}
          {active === "roles" ? <RolePanel /> : null}
          {active === "devices" ? <DevicePanel /> : null}
          {active === "logins" ? <LoginHistoryPanel /> : null}
          {active === "company" ? <CompanyPanel /> : null}
          {active === "notifications" ? <NotificationPanel /> : null}
          {active === "backup" ? <BackupPanel /> : null}
          {active === "system" ? <SystemPanel /> : null}
        </div>
      </section>
    </section>
  );
}
