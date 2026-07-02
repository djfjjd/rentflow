import type { Role } from "./auth/roles";

export const officePcTypes = ["owner_pc", "team_lead_pc", "manager_pc", "staff_pc"] as const;
export type OfficePcType = (typeof officePcTypes)[number];
export type DeviceOwnerType = "personal" | "office_pc";

export const officePcLabels: Record<OfficePcType, string> = {
  owner_pc: "소장님 PC",
  team_lead_pc: "팀장님 PC",
  manager_pc: "실장님 PC",
  staff_pc: "직원용 PC",
};

export const officePcRoles: Record<OfficePcType, Role> = {
  owner_pc: "super_admin",
  team_lead_pc: "super_admin",
  manager_pc: "manager",
  staff_pc: "staff",
};

const officePcTypeAliases: Record<string, OfficePcType> = {
  owner_pc: "owner_pc",
  director_pc: "owner_pc",
  "소장님 PC": "owner_pc",
  "소장님PC": "owner_pc",
  "소장님": "owner_pc",
  team_lead_pc: "team_lead_pc",
  "팀장님 PC": "team_lead_pc",
  "팀장님PC": "team_lead_pc",
  "팀장님": "team_lead_pc",
  manager_pc: "manager_pc",
  "실장님 PC": "manager_pc",
  "실장님PC": "manager_pc",
  "실장님": "manager_pc",
  staff_pc: "staff_pc",
  "직원용 PC": "staff_pc",
  "직원용PC": "staff_pc",
  "직원용": "staff_pc",
  "직원": "staff_pc",
};

const officePcStorageAliases: Record<OfficePcType, string[]> = officePcTypes.reduce((aliases, type) => {
  aliases[type] = [type];
  return aliases;
}, {} as Record<OfficePcType, string[]>);

for (const [value, type] of Object.entries(officePcTypeAliases)) {
  if (!officePcStorageAliases[type].includes(value)) officePcStorageAliases[type].push(value);
}

export function normalizeOfficePcType(value: unknown): OfficePcType | "" {
  const key = String(value || "").trim();
  return officePcTypeAliases[key] || "";
}

export function officePcTypeToRole(value: unknown): Role | "" {
  const normalized = normalizeOfficePcType(value);
  return normalized ? officePcRoles[normalized] : "";
}

export function officePcTypeStorageValues(value: unknown) {
  const normalized = normalizeOfficePcType(value);
  return normalized ? officePcStorageAliases[normalized] : [];
}

export function roleAllowedForOfficePc(officePcType: string, role: Role) {
  return officePcTypeToRole(officePcType) === role;
}

export function officePcLabel(value: string) {
  const normalized = normalizeOfficePcType(value);
  return normalized ? officePcLabels[normalized] : "-";
}
