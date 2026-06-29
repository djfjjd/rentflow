export const roles = ["super_admin", "manager", "staff"] as const;

export type Role = (typeof roles)[number];

export type RoleDefinition = {
  role: Role;
  label: string;
  description: string;
  permissions: string[];
};

export const roleDefinitions: RoleDefinition[] = [
  {
    role: "super_admin",
    label: "소장님 / 팀장님",
    description: "모든 권한",
    permissions: ["직원 등록", "직원 승인", "권한 변경", "전체 관리"],
  },
  {
    role: "manager",
    label: "실장님",
    description: "일부 관리 권한",
    permissions: ["배회차관리", "계약서 업로드", "일부 관리"],
  },
  {
    role: "staff",
    label: "직원용",
    description: "현장 업무 권한, 나머지는 읽기 전용",
    permissions: ["배차", "회차", "사진촬영본", "분실물", "차량현황판", "사고정비기록"],
  },
];
