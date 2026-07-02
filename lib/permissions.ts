import type { Role } from "./roles";
import type { AuthSession } from "./auth/jwt";

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
  "contracts.upload": "계약서 업로드",
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
    "contracts.upload": false,
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

export const matrixSubjects = [
  { label: "배회차관리", key: "dispatch.manage" },
  { label: "차량수정", key: "vehicles.edit" },
  { label: "사진촬영본", key: "photos.manage" },
  { label: "안 읽은 메시지", key: "messages.manage" },
  { label: "차량현황판", key: "vehicle_board.manage" },
  { label: "계약서 업로드", key: "contracts.upload" },
  { label: "예약일정", key: "reservations.view" },
  { label: "사고정비기록", key: "repairs.view" },
  { label: "분실물관리", key: "lost_items.view" },
  { label: "거래처주소", key: "partners_address.view" },
  { label: "보험사", key: "insurers.view" },
  { label: "공업사", key: "repair_shops.view" },
  { label: "거래처", key: "partners.view" },
  { label: "배차기록", key: "dispatch_logs.view" },
  { label: "회차기록", key: "return_logs.view" },
  { label: "매출통계", key: "revenue.view" },
  { label: "미수금", key: "receivables.view" },
  { label: "세금계산서", key: "tax_invoices.view" },
  { label: "결제내역", key: "payments.view" },
  { label: "법인카드", key: "corporate_cards.view" },
  { label: "알림", key: "notifications.view" },
  { label: "검색", key: "search.view" },
  { label: "관리자 설정센터", key: "settings.view" },
  { label: "직원 등록", key: "staff.create" },
  { label: "직원 수정", key: "staff.update" },
  { label: "직원 삭제", key: "staff.delete" },
  { label: "퇴사 처리", key: "staff.resign" },
  { label: "권한 변경", key: "roles.update" },
  { label: "기기 승인", key: "devices.approve" },
  { label: "원격 로그아웃", key: "devices.remote_logout" },
  { label: "시스템 설정", key: "system.settings" },
  { label: "백업 관리", key: "backup.manage" },
  { label: "회사 정보 수정", key: "company.update" },
] as const;

export const visibleMatrixSubjects = matrixSubjects.filter((subject) => ![
  "insurers.view",
  "repair_shops.view",
  "partners.view",
  "revenue.view",
  "receivables.view",
  "tax_invoices.view",
  "payments.view",
  "corporate_cards.view",
  "company.update",
  "backup.manage",
  "system.settings",
].includes(subject.key));

export const permissionLevels = ["write", "read", "none"] as const;
export const permissionColumns = ["developer", "admin", "manager", "staff"] as const;
export const columnLabels: Record<PermissionColumn, string> = {
  developer: "개발자",
  admin: "관리자",
  manager: "실장님",
  staff: "직원",
};

export type MatrixPermissionKey = (typeof matrixSubjects)[number]["key"];
export type PermissionLevel = (typeof permissionLevels)[number];
export type PermissionColumn = (typeof permissionColumns)[number];
export type PermissionPresetMatrix = Record<PermissionColumn, Record<MatrixPermissionKey, PermissionLevel>>;
export type ColumnMode = "allWrite" | "allNone" | "custom";

const permissionPresetId = "current";
const permissionRank: Record<PermissionLevel, number> = {
  none: 0,
  read: 1,
  write: 2,
};

const managerWrite: MatrixPermissionKey[] = [
  "dispatch.manage",
  "vehicles.edit",
  "photos.manage",
  "messages.manage",
  "vehicle_board.manage",
  "contracts.upload",
];

const managerRead: MatrixPermissionKey[] = [
  "reservations.view",
  "repairs.view",
  "lost_items.view",
  "partners_address.view",
  "insurers.view",
  "repair_shops.view",
  "partners.view",
  "dispatch_logs.view",
  "return_logs.view",
  "revenue.view",
  "receivables.view",
  "tax_invoices.view",
  "payments.view",
  "corporate_cards.view",
  "notifications.view",
  "search.view",
];

const staffWrite: MatrixPermissionKey[] = ["dispatch.manage", "repairs.view", "lost_items.view"];
const staffRead: MatrixPermissionKey[] = ["vehicle_board.manage", "photos.manage", "reservations.view", "partners_address.view", "dispatch_logs.view"];

export const defaultPermissionPresetMatrix: PermissionPresetMatrix = {
  developer: makeColumnPreset("write"),
  admin: makeColumnPreset("write"),
  manager: makeCustomPreset(managerWrite, managerRead),
  staff: makeCustomPreset(staffWrite, staffRead),
};

export function cyclePermissionLevel(level: PermissionLevel): PermissionLevel {
  if (level === "write") return "read";
  if (level === "read") return "none";
  return "write";
}

export function cycleColumnMode(mode: ColumnMode): ColumnMode {
  if (mode === "allWrite") return "allNone";
  if (mode === "allNone") return "custom";
  return "allWrite";
}

export function modeForColumn(matrix: PermissionPresetMatrix, column: PermissionColumn, custom: boolean): ColumnMode {
  if (custom) return "custom";
  const values = visibleMatrixSubjects.map((subject) => matrix[column][subject.key]);
  if (values.every((value) => value === "write")) return "allWrite";
  if (values.every((value) => value === "none")) return "allNone";
  return "custom";
}

export function applyColumnMode(matrix: PermissionPresetMatrix, column: PermissionColumn, mode: ColumnMode): PermissionPresetMatrix {
  if (mode === "custom") return cloneMatrix(matrix);
  const next = cloneMatrix(matrix);
  const level = mode === "allWrite" ? "write" : "none";
  visibleMatrixSubjects.forEach((subject) => {
    next[column][subject.key] = level;
  });
  return protectDeveloperMinimums(next);
}

export function protectDeveloperMinimums(matrix: PermissionPresetMatrix): PermissionPresetMatrix {
  const next = cloneMatrix(matrix);
  (["settings.view", "roles.update", "system.settings"] as MatrixPermissionKey[]).forEach((key) => {
    next.developer[key] = "write";
  });
  return next;
}

export async function ensurePermissionPresetSchema(db: any) {
  await db.prepare(
    `CREATE TABLE IF NOT EXISTS position_permission_presets (
      id TEXT PRIMARY KEY,
      matrix_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
  ).run();
}

export async function getPermissionPresetMatrix(db: any): Promise<PermissionPresetMatrix> {
  await ensurePermissionPresetSchema(db);
  const row = await db.prepare("SELECT matrix_json FROM position_permission_presets WHERE id = ?").bind(permissionPresetId).first();
  if (!row?.matrix_json) return cloneMatrix(defaultPermissionPresetMatrix);
  try {
    return normalizePermissionPresetMatrix(JSON.parse(String(row.matrix_json)));
  } catch {
    return cloneMatrix(defaultPermissionPresetMatrix);
  }
}

export async function savePermissionPresetMatrix(db: any, matrix: PermissionPresetMatrix) {
  await ensurePermissionPresetSchema(db);
  const now = new Date().toISOString();
  const normalized = protectDeveloperMinimums(normalizePermissionPresetMatrix(matrix));
  await db.prepare(
    `INSERT INTO position_permission_presets (id, matrix_json, created_at, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET matrix_json = excluded.matrix_json, updated_at = excluded.updated_at`,
  ).bind(permissionPresetId, JSON.stringify(normalized), now, now).run();
  return normalized;
}

export function normalizePermissionPresetMatrix(value: unknown): PermissionPresetMatrix {
  const input = value as Partial<Record<PermissionColumn, Partial<Record<MatrixPermissionKey, PermissionLevel>>>>;
  const next = cloneMatrix(defaultPermissionPresetMatrix);
  permissionColumns.forEach((column) => {
    matrixSubjects.forEach((subject) => {
      const level = input?.[column]?.[subject.key];
      if (level === "write" || level === "read" || level === "none") {
        next[column][subject.key] = level;
      }
    });
  });
  return protectDeveloperMinimums(next);
}

export function permissionColumnForSession(session: Pick<AuthSession, "role" | "isDeveloper">): PermissionColumn {
  if (session.isDeveloper) return "developer";
  if (session.role === "super_admin") return "admin";
  if (session.role === "manager") return "manager";
  return "staff";
}

export function getPermissionLevel(matrix: PermissionPresetMatrix, column: PermissionColumn, key: MatrixPermissionKey): PermissionLevel {
  return matrix[column]?.[key] || defaultPermissionPresetMatrix[column]?.[key] || "none";
}

export function hasPermissionLevel(matrix: PermissionPresetMatrix, column: PermissionColumn, key: MatrixPermissionKey, required: PermissionLevel) {
  return permissionRank[getPermissionLevel(matrix, column, key)] >= permissionRank[required];
}

export async function getSessionPermissionLevel(db: any, session: Pick<AuthSession, "role" | "isDeveloper">, key: MatrixPermissionKey) {
  const matrix = await getPermissionPresetMatrix(db);
  return getPermissionLevel(matrix, permissionColumnForSession(session), key);
}

export async function hasStoredPermissionLevel(db: any, session: Pick<AuthSession, "role" | "isDeveloper">, key: MatrixPermissionKey, required: PermissionLevel) {
  const matrix = await getPermissionPresetMatrix(db);
  return hasPermissionLevel(matrix, permissionColumnForSession(session), key, required);
}

export function cloneMatrix(matrix: PermissionPresetMatrix): PermissionPresetMatrix {
  return {
    developer: { ...matrix.developer },
    admin: { ...matrix.admin },
    manager: { ...matrix.manager },
    staff: { ...matrix.staff },
  };
}

function makeColumnPreset(level: PermissionLevel): Record<MatrixPermissionKey, PermissionLevel> {
  return Object.fromEntries(matrixSubjects.map((subject) => [subject.key, level])) as Record<MatrixPermissionKey, PermissionLevel>;
}

function makeCustomPreset(writeKeys: MatrixPermissionKey[], readKeys: MatrixPermissionKey[]) {
  const preset = makeColumnPreset("none");
  writeKeys.forEach((key) => { preset[key] = "write"; });
  readKeys.forEach((key) => { preset[key] = "read"; });
  return preset;
}
