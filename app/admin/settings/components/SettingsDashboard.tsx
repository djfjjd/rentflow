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
        <p className="mt-1 text-sm font-bold text-[#68746d]">직원, 권한, 기기, 로그인 기록을 관리합니다.</p>
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
