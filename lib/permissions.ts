import type { Role } from "./roles";

export const permissionLabels = {
  "dispatch.create": "배회차 입력",
  "dispatch.update": "배회차 수정",
  "dispatch.delete": "배회차 삭제",
  "dispatch.board.view": "배회차현황판 보기",
  "dispatch.board.update_only_dispatching": "배차중 상태만 수정",
  "dispatch.board.delete_only_dispatching": "배차중 상태만 삭제",
  "dispatch.logs.view": "배차기록 보기",
  "dispatch.logs.update": "배차기록 수정",
  "dispatch.logs.delete": "배차기록 삭제",
  "photos.view": "사진촬영본 보기",
  "photos.upload": "사진 업로드",
  "photos.update": "사진 수정",
  "photos.delete": "사진 삭제",
  "reservations.view": "예약일정 보기",
  "reservations.create": "예약일정 입력",
  "reservations.update": "예약일정 수정",
  "reservations.delete": "예약일정 삭제",
  "repair_records.view": "사고정비기록 보기",
  "repair_records.create": "사고정비기록 입력",
  "repair_records.update": "사고정비기록 수정",
  "repair_records.delete": "사고정비기록 삭제",
  "lost_items.view": "분실물 보기",
  "lost_items.create": "분실물 입력",
  "lost_items.update": "분실물 수정",
  "lost_items.delete": "분실물 삭제",
  "partners.view": "거래처주소 보기",
  "partners.create": "거래처주소 입력",
  "partners.update": "거래처주소 수정",
  "partners.delete": "거래처주소 삭제",
  "admin.access": "관리자 접근",
  "admin.any": "관리자 전체",
  "admin.settings.view": "설정센터 보기",
} as const;

export type PermissionKey = keyof typeof permissionLabels;

export const allPermissionKeys = Object.keys(permissionLabels) as PermissionKey[];

export const rolePermissionMap: Record<Role, Record<PermissionKey, boolean>> = {
  super_admin: Object.fromEntries(allPermissionKeys.map((key) => [key, true])) as Record<PermissionKey, boolean>,
  manager: Object.fromEntries(allPermissionKeys.map((key) => [key, true])) as Record<PermissionKey, boolean>,
  staff: {
    "dispatch.create": true,
    "dispatch.update": true,
    "dispatch.delete": true,
    "dispatch.board.view": true,
    "dispatch.board.update_only_dispatching": true,
    "dispatch.board.delete_only_dispatching": true,
    "dispatch.logs.view": true,
    "dispatch.logs.update": false,
    "dispatch.logs.delete": false,
    "photos.view": true,
    "photos.upload": true,
    "photos.update": false,
    "photos.delete": false,
    "reservations.view": true,
    "reservations.create": false,
    "reservations.update": false,
    "reservations.delete": false,
    "repair_records.view": true,
    "repair_records.create": true,
    "repair_records.update": true,
    "repair_records.delete": false,
    "lost_items.view": true,
    "lost_items.create": true,
    "lost_items.update": true,
    "lost_items.delete": false,
    "partners.view": true,
    "partners.create": false,
    "partners.update": false,
    "partners.delete": false,
    "admin.access": false,
    "admin.any": false,
    "admin.settings.view": false,
  },
};

export const rolePermissions: Record<Role, string[]> = {
  super_admin: allPermissionKeys,
  manager: allPermissionKeys,
  staff: allPermissionKeys.filter((key) => rolePermissionMap.staff[key]),
};

export function hasPermission(role: Role, key: PermissionKey) {
  return Boolean(rolePermissionMap[role]?.[key]);
}
