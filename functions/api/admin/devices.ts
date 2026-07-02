import { safeBindValues, safeNullableText, safeText } from "../_d1-utils";
import { requireAdminSession, type AdminApiEnv } from "./_auth";
import { ensureStaffDeviceSchema } from "./staff";
import { writeAuditLog } from "../../../lib/audit-logs";
import { isDesktopDevice } from "../../../lib/device-detection";
import { normalizeOfficePcType, officePcLabel, officePcRoles, officePcTypes } from "../../../lib/office-pc-policy";

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
         WHERE devices.status IS NULL OR devices.status = '' OR devices.status IN ('승인대기', 'pending_approval', 'email_verified_pending', '이메일인증대기', '승인', 'approved')
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
        `INSERT INTO devices (id, user_id, device_id, device_name, device_alias, device_model, device_type, device_scope, device_owner_type, office_pc_type, location, os, browser, email, status, created_at, updated_at, last_seen_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(...safeBindValues([
        id,
        safeNullableText(body.userId || body.user_id),
        safeText(body.deviceId || body.device_id || crypto.randomUUID()),
        safeNullableText(body.deviceName || body.device_name || body.deviceAlias || body.device_alias),
        safeNullableText(body.deviceAlias || body.device_alias),
        safeNullableText(body.deviceModel || body.device_model),
        safeText(body.deviceType || body.device_type || "desktop"),
        safeText(body.deviceScope || body.device_scope || ((body.deviceOwnerType || body.device_owner_type) === "office_pc" ? "office_pc" : "personal_mobile")),
        safeText(body.deviceOwnerType || body.device_owner_type || "personal"),
        safeNullableText(normalizeOfficePcType(body.officePcType || body.office_pc_type) || body.officePcType || body.office_pc_type),
        safeNullableText(body.location),
        safeNullableText(body.os),
        safeNullableText(body.browser),
        safeNullableText(body.email),
        normalizeDeviceStatus(body.status || "승인대기"),
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
      const currentDevice = await env.DB.prepare("SELECT device_type, device_owner_type FROM devices WHERE id = ?").bind(safeText(id)).first();
      const fields: string[] = [];
      const values: unknown[] = [];

      if (action === "approve") {
        const isOfficePc = currentDevice?.device_owner_type === "office_pc";
        const autoLogin = !isOfficePc && !isDesktopDevice(String(currentDevice?.device_type || "desktop"));
        fields.push("status = ?", "trusted = ?", "auto_login = ?", "approved_by = ?", "approved_at = ?");
        values.push("승인", autoLogin ? 1 : 0, autoLogin ? 1 : 0, auth.session.email, new Date().toISOString());
        await writeAuditLog(env.DB, { event: "device_approved", actorEmail: auth.session.email, targetId: id });
        if (autoLogin) await writeAuditLog(env.DB, { event: "trusted_device_enabled", actorEmail: auth.session.email, targetId: id });
        if (body.userId || body.user_id) {
          fields.push("user_id = ?");
          values.push(safeText(body.userId || body.user_id));
        }
      } else if (action === "remoteLogout") {
        const now = new Date().toISOString();
        fields.push("trusted = ?", "auto_login = ?", "revoked_at = ?");
        values.push(0, 0, now);
        await env.DB.prepare("UPDATE sessions SET status = 'revoked', revoked_at = ? WHERE device_id = ? AND status = 'active'").bind(now, safeText(id)).run();
        await writeAuditLog(env.DB, { event: "device_remote_logout", actorEmail: auth.session.email, targetId: id });
        await writeAuditLog(env.DB, { event: "trusted_device_disabled", actorEmail: auth.session.email, targetId: id });
      } else if (action === "setAutoLogin") {
        const enabled = body.autoLogin === true || body.auto_login === true || body.autoLogin === 1 || body.auto_login === 1;
        if (enabled && (currentDevice?.device_owner_type === "office_pc" || isDesktopDevice(String(currentDevice?.device_type || "desktop")))) {
          return Response.json({ error: "사무실 PC 또는 데스크탑 기기는 자동 로그인을 사용할 수 없습니다." }, { status: 400 });
        }
        fields.push("trusted = ?", "auto_login = ?");
        values.push(enabled ? 1 : 0, enabled ? 1 : 0);
        if (!enabled) {
          const now = new Date().toISOString();
          await env.DB.prepare("UPDATE sessions SET status = 'revoked', revoked_at = ? WHERE device_id = ? AND status = 'active'").bind(now, safeText(id)).run();
        }
        await writeAuditLog(env.DB, { event: enabled ? "trusted_device_enabled" : "trusted_device_disabled", actorEmail: auth.session.email, targetId: id });
      }

      if (body.userId !== undefined || body.user_id !== undefined) { fields.push("user_id = ?"); values.push(safeNullableText(body.userId ?? body.user_id)); }
      if (body.deviceAlias !== undefined || body.device_alias !== undefined) { fields.push("device_alias = ?"); values.push(safeNullableText(body.deviceAlias ?? body.device_alias)); }
      if (body.deviceName !== undefined || body.device_name !== undefined) { fields.push("device_name = ?"); values.push(safeNullableText(body.deviceName ?? body.device_name)); }
      if (body.deviceModel !== undefined || body.device_model !== undefined) { fields.push("device_model = ?"); values.push(safeNullableText(body.deviceModel ?? body.device_model)); }
      if (body.deviceType !== undefined || body.device_type !== undefined) { fields.push("device_type = ?"); values.push(safeText(body.deviceType ?? body.device_type)); }
      if (body.deviceScope !== undefined || body.device_scope !== undefined) { fields.push("device_scope = ?"); values.push(safeText(body.deviceScope ?? body.device_scope)); }
      if (body.deviceOwnerType !== undefined || body.device_owner_type !== undefined) { fields.push("device_owner_type = ?"); values.push(safeText(body.deviceOwnerType ?? body.device_owner_type)); }
      if (body.officePcType !== undefined || body.office_pc_type !== undefined) {
        const officePcType = body.officePcType ?? body.office_pc_type;
        fields.push("office_pc_type = ?");
        values.push(safeNullableText(normalizeOfficePcType(officePcType) || officePcType));
      }
      if (body.location !== undefined) { fields.push("location = ?"); values.push(safeNullableText(body.location)); }
      if (body.os !== undefined) { fields.push("os = ?"); values.push(safeNullableText(body.os)); }
      if (body.browser !== undefined) { fields.push("browser = ?"); values.push(safeNullableText(body.browser)); }
      if (body.email !== undefined) { fields.push("email = ?"); values.push(safeNullableText(body.email)); }
      if (body.status !== undefined) { fields.push("status = ?"); values.push(normalizeDeviceStatus(body.status)); }
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
      const now = new Date().toISOString();
      await env.DB.prepare("UPDATE sessions SET status = 'revoked', revoked_at = ? WHERE device_id = ? AND status = 'active'").bind(now, safeText(id)).run();
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

function normalizeDeviceStatus(value: unknown) {
  const status = safeText(value);
  return ["승인대기", "pending_approval", "email_verified_pending", "이메일인증대기", "승인", "approved"].includes(status) ? status : "승인대기";
}

function mapDevice(row: any) {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name || "",
    position: row.user_position || "",
    role: row.user_role || "staff",
    deviceId: row.device_id,
    deviceName: row.device_name || row.device_alias || "",
    deviceAlias: row.device_name || row.device_alias || "",
    deviceModel: row.device_model || "",
    deviceType: row.device_type || "desktop",
    deviceScope: row.device_scope || (row.device_owner_type === "office_pc" ? "office_pc" : "personal_mobile"),
    deviceOwnerType: row.device_owner_type || "personal",
    officePcType: normalizeOfficePcType(row.office_pc_type) || row.office_pc_type || "",
    location: row.location || "",
    os: row.os || "",
    browser: row.browser || "",
    email: row.email || "",
    status: row.status,
    trusted: Boolean(row.trusted),
    autoLogin: Boolean(row.auto_login),
    approvedBy: row.approved_by || "",
    approvedAt: row.approved_at || "",
    deletedAt: row.deleted_at || "",
    revokedAt: row.revoked_at || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastSeenAt: row.last_seen_at || "",
  };
}

export function buildOfficePcCards(devices: ReturnType<typeof mapDevice>[]) {
  return officePcTypes.map((type) => {
    const device = devices.find((item) => item.deviceOwnerType === "office_pc" && normalizeOfficePcType(item.officePcType) === type);
    return {
      type,
      label: officePcLabel(type),
      role: officePcRoles[type],
      status: device?.status || "미등록",
      device,
    };
  });
}
