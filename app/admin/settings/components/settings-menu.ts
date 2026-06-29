export type SettingsSection =
  | "staff"
  | "roles"
  | "devices"
  | "logins"
  | "company"
  | "notifications"
  | "backup"
  | "system";

export type SettingsMenuItem = {
  id: SettingsSection;
  icon: string;
  label: string;
};

export const settingsMenuItems: SettingsMenuItem[] = [
  { id: "staff", icon: "👥", label: "직원 관리" },
  { id: "roles", icon: "🔐", label: "권한 관리" },
  { id: "devices", icon: "📱", label: "기기 관리" },
  { id: "logins", icon: "📜", label: "로그인 기록" },
  { id: "company", icon: "🏢", label: "회사 정보" },
  { id: "notifications", icon: "🔔", label: "알림 설정" },
  { id: "backup", icon: "☁", label: "백업 관리" },
  { id: "system", icon: "⚙", label: "시스템 설정" },
];
