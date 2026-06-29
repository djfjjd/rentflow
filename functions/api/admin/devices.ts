import { safeBindValues, safeNullableText, safeText } from "../_d1-utils";
import { requireAdminSession, type AdminApiEnv } from "./_auth";
import { ensureStaffDeviceSchema } from "./staff";
import { writeAuditLog } from "../../../lib/audit-logs";

export const onRequest: PagesFunction<AdminApiEnv> = async ({ request, env }) => {
  try {
    await ensureStaffDeviceSchema(env.DB);

    if (request.method === "GET") {
      const auth = await requireAdminSession(request, env, "read");
      if (auth.response) return auth.response;
      const { results } = await env.DB.prepare(
        `SELECT devices.*, users.name AS user_name, users.position AS user_position, users.role AS user_role
         FROM devices
         LEFT JOIN users ON users.id = devices.user_id
         ORDER BY devices.updated_at DESC`,
      ).all();
      return Response.json((results || []).map(mapDevice));
    }

    if (request.method === "POST") {
      const auth = await requireAdminSession(request, env, "write");
      if (auth.response) return auth.response;
      const body = (await request.json().catch(() => ({}))) as any;
      const id = safeText(body.id || crypto.randomUUID());
      const now = new Date().toISOString();
      await env.DB.prepare(
        `INSERT INTO devices (id, user_id, device_id, device_alias, device_model, os, browser, email, status, created_at, updated_at, last_seen_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(...safeBindValues([
        id,
        safeNullableText(body.userId || body.user_id),
        safeText(body.deviceId || body.device_id || crypto.randomUUID()),
        safeNullableText(body.deviceAlias || body.device_alias),
        safeNullableText(body.deviceModel || body.device_model),
        safeNullableText(body.os),
        safeNullableText(body.browser),
        safeNullableText(body.email),
        safeText(body.status || "승인대기"),
        now,
        now,
        safeNullableText(body.lastSeenAt || body.last_seen_at),
      ])).run();
      return Response.json({ device: await getDevice(env.DB, id) });
    }

    if (request.method === "PATCH") {
      const auth = await requireAdminSession(request, env, "write");
      if (auth.response) return auth.response;
      const url = new URL(request.url);
      const id = url.searchParams.get("id");
      if (!id) return Response.json({ error: "id is required" }, { status: 400 });
      const body = (await request.json().catch(() => ({}))) as any;
      const action = safeText(body.action);
      const fields: string[] = [];
      const values: unknown[] = [];

      if (action === "approve") {
        fields.push("status = ?");
        values.push("승인");
        await writeAuditLog(env.DB, { event: "device_approved", actorEmail: auth.session.email, targetId: id });
        if (body.userId || body.user_id) {
          fields.push("user_id = ?");
          values.push(safeText(body.userId || body.user_id));
        }
      } else if (action === "block") {
        fields.push("status = ?");
        values.push("차단");
        await env.DB.prepare("UPDATE sessions SET status = 'revoked' WHERE device_id = ? AND status = 'active'").bind(safeText(id)).run();
        await writeAuditLog(env.DB, { event: "device_blocked", actorEmail: auth.session.email, targetId: id });
      }

      if (body.userId !== undefined || body.user_id !== undefined) { fields.push("user_id = ?"); values.push(safeNullableText(body.userId ?? body.user_id)); }
      if (body.deviceAlias !== undefined || body.device_alias !== undefined) { fields.push("device_alias = ?"); values.push(safeNullableText(body.deviceAlias ?? body.device_alias)); }
      if (body.deviceModel !== undefined || body.device_model !== undefined) { fields.push("device_model = ?"); values.push(safeNullableText(body.deviceModel ?? body.device_model)); }
      if (body.os !== undefined) { fields.push("os = ?"); values.push(safeNullableText(body.os)); }
      if (body.browser !== undefined) { fields.push("browser = ?"); values.push(safeNullableText(body.browser)); }
      if (body.email !== undefined) { fields.push("email = ?"); values.push(safeNullableText(body.email)); }
      if (body.status !== undefined) { fields.push("status = ?"); values.push(safeText(body.status)); }
      if (body.lastSeenAt !== undefined || body.last_seen_at !== undefined) { fields.push("last_seen_at = ?"); values.push(safeNullableText(body.lastSeenAt ?? body.last_seen_at)); }

      if (!fields.length) return Response.json({ device: await getDevice(env.DB, id) });
      fields.push("updated_at = ?");
      values.push(new Date().toISOString(), id);
      await env.DB.prepare(`UPDATE devices SET ${fields.join(", ")} WHERE id = ?`).bind(...safeBindValues(values)).run();
      return Response.json({ device: await getDevice(env.DB, id) });
    }

    if (request.method === "DELETE") {
      const auth = await requireAdminSession(request, env, "write");
      if (auth.response) return auth.response;
      const url = new URL(request.url);
      const id = url.searchParams.get("id");
      if (!id) return Response.json({ error: "id is required" }, { status: 400 });
      await env.DB.prepare("UPDATE sessions SET status = 'revoked' WHERE device_id = ?").bind(safeText(id)).run();
      await env.DB.prepare("DELETE FROM devices WHERE id = ?").bind(safeText(id)).run();
      await writeAuditLog(env.DB, { event: "device_deleted", actorEmail: auth.session.email, targetId: id });
      return Response.json({ success: true });
    }

    return Response.json({ error: "Method not allowed." }, { status: 405 });
  } catch (error) {
    console.error("device admin api failed", { error: error instanceof Error ? error.message : String(error) });
    return Response.json({ error: String(error) }, { status: 500 });
  }
};

async function getDevice(db: any, id: string) {
  const row = await db.prepare(
    `SELECT devices.*, users.name AS user_name, users.position AS user_position, users.role AS user_role
     FROM devices
     LEFT JOIN users ON users.id = devices.user_id
     WHERE devices.id = ?`,
  ).bind(safeText(id)).first();
  return row ? mapDevice(row) : null;
}

function mapDevice(row: any) {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name || "",
    position: row.user_position || "",
    role: row.user_role || "staff",
    deviceId: row.device_id,
    deviceAlias: row.device_alias || "",
    deviceModel: row.device_model || "",
    os: row.os || "",
    browser: row.browser || "",
    email: row.email || "",
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastSeenAt: row.last_seen_at || "",
  };
}
