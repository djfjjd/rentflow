"use client";

import { useState } from "react";
import { DeviceManagement } from "./DeviceManagement";
import { RolePermissionCards } from "./RolePermissionCards";
import { StaffManagement } from "./StaffManagement";

type SettingsSection = "staff" | "roles" | "devices" | "logins";

type SettingsCard = {
  id: SettingsSection;
  icon: string;
  title: string;
  description: string;
  action: string;
};

const settingsCards: SettingsCard[] = [
  { id: "staff", icon: "👥", title: "직원 관리", description: "직원 계정 등록, 수정, 퇴사 처리를 관리합니다.", action: "직원 관리" },
  { id: "roles", icon: "🔐", title: "권한(Role) 관리", description: "소장님, 팀장님, 실장님, 직원 권한을 설정합니다.", action: "권한 관리" },
  { id: "devices", icon: "📱", title: "기기 관리", description: "로그인한 기기 승인, 차단, 역할 배정을 관리합니다.", action: "기기 관리" },
  { id: "logins", icon: "📜", title: "로그인 기록", description: "로그인 시간, 이메일, 기기, IP 기록을 확인합니다.", action: "로그인 기록" },
];

export function SettingsDashboard() {
  const [active, setActive] = useState<SettingsSection>("staff");

  return (
    <section className="space-y-4">
      <header className="panel">
        <h1 className="text-2xl font-black">관리자 설정센터</h1>
        <p className="mt-1 text-sm font-bold text-[#68746d]">직원, 권한, 기기, 로그인 기록을 관리합니다.</p>
      </header>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {settingsCards.map((card) => (
          <button
            className={`panel min-h-44 text-left transition ${active === card.id ? "border-[#116149] ring-2 ring-[#116149]/20" : ""}`}
            key={card.id}
            type="button"
            onClick={() => setActive(card.id)}
          >
            <span className="text-3xl" aria-hidden="true">{card.icon}</span>
            <h2 className="mt-3 text-lg font-black">{card.title}</h2>
            <p className="mt-2 min-h-12 text-sm font-bold text-[#68746d]">{card.description}</p>
            <span className="mt-4 inline-flex min-h-10 items-center rounded-lg bg-[#116149] px-3 text-sm font-black text-white">{card.action}</span>
          </button>
        ))}
      </section>

      <section className="sticky top-[74px] z-20 rounded-lg bg-[#eef4ed] p-1.5">
        <div className="grid grid-cols-2 gap-1 md:grid-cols-4">
          {settingsCards.map((card) => (
            <button
              className={`min-h-11 rounded-lg px-3 text-sm font-black ${active === card.id ? "bg-[#116149] text-white" : "bg-white text-[#25342e]"}`}
              key={card.id}
              type="button"
              onClick={() => setActive(card.id)}
            >
              {card.action}
            </button>
          ))}
        </div>
      </section>

      {active === "staff" ? <StaffManagement /> : null}
      {active === "roles" ? <RolePermissionCards /> : null}
      {active === "devices" ? <DeviceManagement /> : null}
      {active === "logins" ? <LoginHistorySection /> : null}
    </section>
  );
}

function LoginHistorySection() {
  return (
    <section className="panel overflow-hidden">
      <h3 className="mb-3 text-lg font-black">로그인 기록</h3>
      <div data-horizontal-scroll="true" className="overflow-x-auto">
        <table className="admin-table w-full min-w-[860px] text-left text-sm">
          <thead><tr className="border-b"><th>로그인 시간</th><th>이메일</th><th>기기</th><th>IP</th><th>상태</th></tr></thead>
          <tbody>
            <tr className="border-b">
              <td>준비중</td><td>직원 계정 연동 후 표시</td><td>-</td><td>-</td><td>구조 준비</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
