export type AuditEvent =
  | "settings_2fa_requested"
  | "settings_2fa_success"
  | "settings_2fa_failed"
  | "staff_created"
  | "staff_deleted"
  | "staff_resigned"
  | "role_changed"
  | "device_registered"
  | "device_approved"
  | "device_remote_logout"
  | "device_blocked"
  | "device_deleted"
  | "trusted_device_enabled"
  | "trusted_device_disabled"
  | "auto_login_success"
  | "auto_login_failed"
  | "login_success"
  | "login_failed";

export type AuditLogInput = {
  event: AuditEvent;
  actorEmail?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
};

export async function ensureAuditLogSchema(db: any) {
  await db.prepare(
    `CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      event TEXT NOT NULL,
      actor_email TEXT,
      target_id TEXT,
      metadata TEXT,
      created_at TEXT NOT NULL
    )`,
  ).run();
}

export async function writeAuditLog(db: any, input: AuditLogInput) {
  if (!db) return;
  await ensureAuditLogSchema(db);
  await db.prepare(
    `INSERT INTO audit_logs (id, event, actor_email, target_id, metadata, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).bind(
    crypto.randomUUID(),
    input.event,
    input.actorEmail || "",
    input.targetId || "",
    JSON.stringify(input.metadata || {}),
    new Date().toISOString(),
  ).run();
}
