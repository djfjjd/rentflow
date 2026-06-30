import type { Role } from "./auth/roles";

export const officePcTypes = ["director_pc", "team_lead_pc", "manager_pc", "staff_pc"] as const;
export type OfficePcType = (typeof officePcTypes)[number];
export type DeviceOwnerType = "personal" | "office_pc";

export const officePcLabels: Record<OfficePcType, string> = {
  director_pc: "소장님 PC",
  team_lead_pc: "팀장님 PC",
  manager_pc: "실장님 PC",
  staff_pc: "직원용 PC",
};

export const officePcRoles: Record<OfficePcType, Role> = {
  director_pc: "super_admin",
  team_lead_pc: "super_admin",
  manager_pc: "manager",
  staff_pc: "staff",
};

export function normalizeOfficePcType(value: unknown): OfficePcType | "" {
  return officePcTypes.includes(value as OfficePcType) ? value as OfficePcType : "";
}

export function roleAllowedForOfficePc(officePcType: string, role: Role) {
  const normalized = normalizeOfficePcType(officePcType);
  return Boolean(normalized && officePcRoles[normalized] === role);
}

export function officePcLabel(value: string) {
  const normalized = normalizeOfficePcType(value);
  return normalized ? officePcLabels[normalized] : "-";
}
