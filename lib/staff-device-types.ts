import type { Role } from "./roles";

export const positions = ["개발자", "관리자", "실장님", "직원"] as const;
export const staffStatuses = ["재직", "휴직", "퇴사"] as const;
export const deviceStatuses = ["승인대기", "pending_approval", "email_verified_pending", "이메일인증대기", "승인"] as const;
export const sessionStatuses = ["active", "revoked", "expired"] as const;

export type Position = (typeof positions)[number];
export type StaffStatus = (typeof staffStatuses)[number];
export type DeviceStatus = (typeof deviceStatuses)[number];
export type SessionStatus = (typeof sessionStatuses)[number];

export type StaffUser = {
  id: string;
  name: string;
  position: Position | string;
  role: Role;
  loginId: string;
  email: string;
  status: StaffStatus;
  createdAt: string;
  updatedAt: string;
};

export type StaffDevice = {
  id: string;
  userId: string;
  userName: string;
  position: Position | string;
  role: Role;
  deviceId: string;
  deviceName: string;
  deviceAlias: string;
  deviceModel: string;
  deviceType: "mobile" | "tablet" | "desktop" | string;
  deviceScope: "personal_mobile" | "office_pc" | string;
  deviceOwnerType: "personal" | "office_pc" | string;
  officePcType: string;
  location: string;
  os: string;
  browser: string;
  email: string;
  status: DeviceStatus;
  trusted: boolean;
  autoLogin: boolean;
  approvedBy: string;
  approvedAt: string;
  deletedAt: string;
  revokedAt: string;
  createdAt: string;
  updatedAt: string;
  lastSeenAt: string;
};

export type LoginSession = {
  id: string;
  userId: string;
  deviceId: string;
  status: SessionStatus;
  createdAt: string;
  expiresAt: string;
};

export type LoginLog = {
  id: string;
  email: string;
  loginId: string;
  role: string;
  deviceId: string;
  userName: string;
  position: string;
  deviceAlias: string;
  deviceModel: string;
  os: string;
  browser: string;
  ip: string;
  userAgent: string;
  status: "success" | "failure" | string;
  message: string;
  createdAt: string;
};
