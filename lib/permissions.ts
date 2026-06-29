import type { Role } from "./roles";

export const rolePermissions: Record<Role, string[]> = {
  super_admin: ["모든 권한", "직원 등록", "직원 승인", "권한 변경", "설정센터 접근"],
  manager: ["배회차관리", "계약서 업로드", "일부 관리"],
  staff: ["배차", "회차", "사진촬영본", "분실물", "차량현황판", "사고정비기록", "읽기 전용"],
};
