import { ensureColumns, safeBindValues, safeNullableText, safeText } from "../_d1-utils";
import { requireAdminSession, type AdminApiEnv } from "./_auth";
import { ensureAuditLogSchema, writeAuditLog } from "../../../lib/audit-logs";
import { ensureEmailVerificationSchema } from "../../../lib/email-verification";

export const onRequest: PagesFunction<AdminApiEnv> = async ({ request, env }) => {
  try {
    await ensureStaffDeviceSchema(env.DB);

    if (request.method === "GET") {
      const auth = await requireAdminSession(request, env, "read");
      if (auth.response) return auth.response;
      const { results } = await env.DB.prepare("SELECT * FROM users ORDER BY created_at DESC").all();
      return Response.json((results || []).map(mapUser));
    }

    if (request.method === "POST") {
      const auth = await requireAdminSession(request, env, "write");
      if (auth.response) return auth.response;
      const body = (await request.json().catch(() => ({}))) as any;
      const id = safeText(body.id || crypto.randomUUID());
      const now = new Date().toISOString();
      const passwordHash = await hashPassword(safeText(body.temporaryPassword || body.password || ""));
      await env.DB.prepare(
        `INSERT INTO users (id, name, position, role, login_id, password_hash, email, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(...safeBindValues([
        id,
        safeText(body.name),
        safeText(body.position),
        safeText(body.role || "staff"),
        safeText(body.loginId || body.login_id),
        passwordHash,
        safeText(body.email).toLowerCase(),
        "재직",
        now,
        now,
      ])).run();
      await writeAuditLog(env.DB, { event: "staff_created", actorEmail: auth.session.email, targetId: id, metadata: { role: body.role, position: body.position } });
      return Response.json({ user: await getUser(env.DB, id) });
    }

    if (request.method === "PATCH") {
      const auth = await requireAdminSession(request, env, "write");
      if (auth.response) return auth.response;
      const url = new URL(request.url);
      const id = url.searchParams.get("id");
      if (!id) return Response.json({ error: "id is required" }, { status: 400 });
      const body = (await request.json().catch(() => ({}))) as any;
      const action = safeText(body.action);

      if (action === "retire") {
        await retireUser(env.DB, id);
        await writeAuditLog(env.DB, { event: "staff_resigned", actorEmail: auth.session.email, targetId: id });
        return Response.json({ user: await getUser(env.DB, id) });
      }

      const fields: string[] = [];
      const values: unknown[] = [];
      if (body.name !== undefined) { fields.push("name = ?"); values.push(safeText(body.name)); }
      if (body.position !== undefined) { fields.push("position = ?"); values.push(safeText(body.position)); }
      if (body.role !== undefined) { fields.push("role = ?"); values.push(safeText(body.role)); }
      if (body.loginId !== undefined || body.login_id !== undefined) { fields.push("login_id = ?"); values.push(safeText(body.loginId ?? body.login_id)); }
      if (body.email !== undefined) { fields.push("email = ?"); values.push(safeText(body.email).toLowerCase()); }
      if (body.status !== undefined) { fields.push("status = ?"); values.push(safeText(body.status)); }
      if (body.temporaryPassword !== undefined || body.password !== undefined) {
        fields.push("password_hash = ?");
        values.push(await hashPassword(safeText(body.temporaryPassword ?? body.password)));
      }
      if (!fields.length) return Response.json({ user: await getUser(env.DB, id) });
      fields.push("updated_at = ?");
      values.push(new Date().toISOString(), id);
      await env.DB.prepare(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`).bind(...safeBindValues(values)).run();

      if (body.role !== undefined) await writeAuditLog(env.DB, { event: "role_changed", actorEmail: auth.session.email, targetId: id, metadata: { role: body.role } });
      if (safeText(body.status) === "퇴사") {
        await retireUser(env.DB, id);
        await writeAuditLog(env.DB, { event: "staff_resigned", actorEmail: auth.session.email, targetId: id });
      }
      return Response.json({ user: await getUser(env.DB, id) });
    }

    if (request.method === "DELETE") {
      const auth = await requireAdminSession(request, env, "write");
      if (auth.response) return auth.response;
      const url = new URL(request.url);
      const id = url.searchParams.get("id");
      if (!id) return Response.json({ error: "id is required" }, { status: 400 });
      await retireUser(env.DB, id);
      await env.DB.prepare("DELETE FROM users WHERE id = ?").bind(safeText(id)).run();
      await writeAuditLog(env.DB, { event: "staff_deleted", actorEmail: auth.session.email, targetId: id });
      return Response.json({ success: true });
    }

    return Response.json({ error: "Method not allowed." }, { status: 405 });
  } catch (error) {
    console.error("staff admin api failed", { error: error instanceof Error ? error.message : String(error) });
    return Response.json({ error: String(error) }, { status: 500 });
  }
};

export async function ensureStaffDeviceSchema(db: any) {
  await db.prepare(
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      position TEXT NOT NULL,
      role TEXT NOT NULL,
      login_id TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      email TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT '재직',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
  ).run();
  await db.prepare(
    `CREATE TABLE IF NOT EXISTS devices (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      device_id TEXT NOT NULL UNIQUE,
      device_alias TEXT,
      device_model TEXT,
      device_type TEXT NOT NULL DEFAULT 'desktop',
      os TEXT,
      browser TEXT,
      email TEXT,
      status TEXT NOT NULL DEFAULT '승인대기',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_seen_at TEXT,
      trusted INTEGER NOT NULL DEFAULT 0,
      auto_login INTEGER NOT NULL DEFAULT 0,
      approved_by TEXT,
      approved_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`,
  ).run();
  await db.prepare(
    `CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      device_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (device_id) REFERENCES devices(id)
    )`,
  ).run();
  await db.prepare(
    `CREATE TABLE IF NOT EXISTS login_logs (
      id TEXT PRIMARY KEY,
      email TEXT,
      login_id TEXT,
      role TEXT,
      device_id TEXT,
      ip TEXT,
      user_agent TEXT,
      status TEXT NOT NULL,
      message TEXT,
      created_at TEXT NOT NULL
    )`,
  ).run();
  await ensureAuditLogSchema(db);
  await ensureEmailVerificationSchema(db);
  await ensureColumns(db, "devices", [
    { name: "device_type", definition: "TEXT NOT NULL DEFAULT 'desktop'" },
    { name: "trusted", definition: "INTEGER NOT NULL DEFAULT 0" },
    { name: "auto_login", definition: "INTEGER NOT NULL DEFAULT 0" },
    { name: "approved_by", definition: "TEXT" },
    { name: "approved_at", definition: "TEXT" },
  ]);
}

async function getUser(db: any, id: string) {
  const row = await db.prepare("SELECT * FROM users WHERE id = ?").bind(safeText(id)).first();
  return row ? mapUser(row) : null;
}

async function retireUser(db: any, id: string) {
  const now = new Date().toISOString();
  await db.prepare("UPDATE users SET status = '퇴사', updated_at = ? WHERE id = ?").bind(now, safeText(id)).run();
  await db.prepare("UPDATE devices SET status = '차단', trusted = 0, auto_login = 0, updated_at = ? WHERE user_id = ?").bind(now, safeText(id)).run();
  await db.prepare("UPDATE sessions SET status = 'revoked' WHERE user_id = ? AND status = 'active'").bind(safeText(id)).run();
}

async function hashPassword(password: string) {
  const source = password || crypto.randomUUID();
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(source)));
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function mapUser(row: any) {
  return {
    id: row.id,
    name: row.name,
    position: row.position,
    role: row.role,
    loginId: row.login_id,
    email: row.email,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
