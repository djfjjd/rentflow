import { normalizeEmail, readCookie } from "../../../lib/auth/jwt";
import { ensureEmailVerificationSchema, verificationId } from "../../../lib/email-verification";
import { writeAuditLog } from "../../../lib/audit-logs";
import { safeBindValues, safeNullableText, safeText } from "../_d1-utils";
import { ensureStaffDeviceSchema } from "../admin/staff";
import { detectDeviceInfo } from "../../../lib/device-detection";
import { normalizeOfficePcType, type DeviceOwnerType } from "../../../lib/office-pc-policy";

type Env = {
  DB: any;
};

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method !== "POST") return Response.json({ error: "Method not allowed." }, { status: 405 });
  const body = (await request.json().catch(() => ({}))) as {
    email?: string;
    code?: string;
    deviceId?: string;
    device_id?: string;
    name?: string;
    deviceOwnerType?: DeviceOwnerType;
    device_owner_type?: DeviceOwnerType;
    officePcType?: string;
    office_pc_type?: string;
    location?: string;
  };
  const email = normalizeEmail(String(body.email || ""));
  const code = safeText(body.code).trim();
  const deviceId = safeText(body.deviceId || body.device_id || readCookie(request.headers.get("Cookie"), "rentflow_device_id") || "");
  if (!email || !deviceId) return Response.json({ error: "인증 정보가 부족합니다." }, { status: 400 });
  if (!/^\d{6}$/.test(code)) return Response.json({ error: "인증코드가 올바르지 않습니다." }, { status: 401 });

  await ensureStaffDeviceSchema(env.DB);
  await ensureEmailVerificationSchema(env.DB);
  const row = await env.DB.prepare("SELECT * FROM email_verification_codes WHERE id = ? AND email = ? AND device_id = ?").bind(verificationId(email, deviceId), email, deviceId).first();
  if (!row || row.used_at || row.code !== code) {
    await writeAuditLog(env.DB, { event: "settings_2fa_failed", actorEmail: email, targetId: deviceId, metadata: { type: "device_email_verification" } });
    return Response.json({ error: "인증코드가 올바르지 않습니다." }, { status: 401 });
  }
  if (new Date(String(row.expires_at)).getTime() <= Date.now()) {
    await writeAuditLog(env.DB, { event: "settings_2fa_failed", actorEmail: email, targetId: deviceId, metadata: { type: "device_email_verification_expired" } });
    return Response.json({ error: "인증코드가 만료되었습니다." }, { status: 410 });
  }

  const now = new Date().toISOString();
  const staff = await env.DB.prepare(
    "SELECT id, name, position, role, status, deleted_at FROM users WHERE lower(email) = ?",
  ).bind(email).first();
  if (!staff) return Response.json({ error: "등록되지 않은 직원 이메일입니다." }, { status: 403 });
  if (staff.status === "퇴사") return Response.json({ error: "퇴사 상태 직원은 기기 등록을 할 수 없습니다." }, { status: 403 });
  if (staff.status === "deleted" || staff.deleted_at) return Response.json({ error: "삭제 처리된 직원은 기기 등록을 할 수 없습니다." }, { status: 403 });

  const existingDevice = await env.DB.prepare("SELECT * FROM devices WHERE device_id = ?").bind(deviceId).first();
  if (existingDevice?.status === "차단" || existingDevice?.status === "blocked") {
    return Response.json({ error: "차단된 기기입니다. 관리자에게 문의해주세요." }, { status: 403 });
  }
  if (existingDevice?.status === "deleted" || existingDevice?.deleted_at) {
    return Response.json({ error: "삭제 처리된 기기입니다. 관리자에게 문의해주세요." }, { status: 403 });
  }
  const ownerType: DeviceOwnerType = existingDevice?.device_owner_type === "office_pc" || body.deviceOwnerType === "office_pc" || body.device_owner_type === "office_pc" ? "office_pc" : "personal";
  const officePcType = ownerType === "office_pc" ? normalizeOfficePcType(existingDevice?.office_pc_type || body.officePcType || body.office_pc_type) : "";
  const userAgent = request.headers.get("User-Agent") || "";
  const detected = detectDeviceInfo({
    userAgent,
    platform: request.headers.get("Sec-CH-UA-Platform") || "",
    deviceOwnerType: ownerType,
    officePcType,
    name: body.name || staff.name,
  });

  await env.DB.prepare("UPDATE email_verification_codes SET used_at = ?, updated_at = ? WHERE id = ?").bind(now, now, verificationId(email, deviceId)).run();
  if (existingDevice?.id) {
    await env.DB.prepare(
      `UPDATE devices
       SET user_id = ?, device_name = COALESCE(NULLIF(device_name, ''), ?), device_alias = COALESCE(NULLIF(device_alias, ''), ?),
           device_model = COALESCE(NULLIF(device_model, ''), ?), device_type = ?, device_scope = ?, device_owner_type = ?,
           office_pc_type = ?, location = COALESCE(NULLIF(location, ''), ?), os = ?, browser = ?, email = ?,
           status = 'pending_approval', updated_at = ?
       WHERE device_id = ? AND status NOT IN ('차단', 'blocked', '승인', 'approved', 'deleted')`,
    ).bind(...safeBindValues([
      ownerType === "personal" ? safeText(staff.id) : null,
      safeNullableText(detected.deviceName),
      safeNullableText(detected.deviceName),
      safeNullableText(detected.deviceModel),
      detected.deviceType,
      ownerType === "personal" ? "personal_mobile" : "office_pc",
      ownerType,
      safeNullableText(officePcType),
      safeNullableText(body.location || ""),
      detected.os,
      detected.browser,
      email,
      now,
      deviceId,
    ])).run();
  } else {
    await env.DB.prepare(
      `INSERT INTO devices (id, user_id, device_id, device_name, device_alias, device_model, device_type, device_scope, device_owner_type, office_pc_type, location, os, browser, email, status, created_at, updated_at, last_seen_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_approval', ?, ?, NULL)`,
    ).bind(...safeBindValues([
      crypto.randomUUID(),
      ownerType === "personal" ? safeText(staff.id) : null,
      deviceId,
      safeNullableText(detected.deviceName),
      safeNullableText(detected.deviceName),
      safeNullableText(detected.deviceModel),
      detected.deviceType,
      ownerType === "personal" ? "personal_mobile" : "office_pc",
      ownerType,
      safeNullableText(officePcType),
      safeNullableText(body.location || ""),
      detected.os,
      detected.browser,
      email,
      now,
      now,
    ])).run();
  }
  const updatedDevice = await env.DB.prepare("SELECT id, user_id, device_scope, device_owner_type, status FROM devices WHERE device_id = ?").bind(deviceId).first();
  if (isDevelopmentRuntime()) {
    console.log("device email verification completed", {
      deviceId,
      email,
      device_scope: updatedDevice?.device_scope,
      device_owner_type: updatedDevice?.device_owner_type,
      status: updatedDevice?.status,
      user_id: updatedDevice?.user_id,
      matched_user_id: staff.id,
    });
  }
  await writeAuditLog(env.DB, { event: "device_registered", actorEmail: email, targetId: deviceId, metadata: { status: "pending_approval", deviceScope: updatedDevice?.device_scope, userId: updatedDevice?.user_id } });
  return Response.json({ ok: true, redirectTo: "/auth/pending" });
};

function isDevelopmentRuntime() {
  return typeof process !== "undefined" && process.env.NODE_ENV !== "production";
}
