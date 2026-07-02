import { safeNullableText, safeText } from "./_d1-utils";
import type { AuthSession } from "../../lib/auth/jwt";

export type AuditActor = {
  id: string;
  name: string;
  role: string;
};

export async function getAuditActor(db: any, session: AuthSession | null | undefined): Promise<AuditActor> {
  const role = roleLabel(session?.role);
  const name = safeText(session?.displayName || session?.position || role);
  const email = safeText(session?.email);
  let id = email;
  if (db && email) {
    try {
      const row = await db.prepare("SELECT id FROM users WHERE lower(email) = lower(?) LIMIT 1").bind(email).first();
      id = safeText(row?.id || email);
    } catch {
      id = email;
    }
  }
  return { id, name, role };
}

export function roleLabel(role?: string) {
  if (role === "super_admin") return "관리자";
  if (role === "manager") return "실장";
  if (role === "staff") return "직원";
  return "직원";
}

export function auditColumns() {
  return [
    { name: "created_by_id", definition: "TEXT" },
    { name: "created_by_name", definition: "TEXT" },
    { name: "created_by_role", definition: "TEXT" },
    { name: "updated_by_id", definition: "TEXT" },
    { name: "updated_by_name", definition: "TEXT" },
    { name: "updated_at", definition: "DATETIME" },
  ];
}

export function mapAuditFields(row: any) {
  return {
    createdById: row.created_by_id,
    createdByName: row.created_by_name,
    createdByRole: row.created_by_role,
    updatedById: row.updated_by_id,
    updatedByName: row.updated_by_name,
    updatedAt: row.updated_at,
  };
}

export function nullableAuditValue(value: unknown) {
  return safeNullableText(value);
}
