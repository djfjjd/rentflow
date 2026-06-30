import { normalizeEmail, readCookie } from "../../../lib/auth/jwt";
import { detectDeviceType } from "../../../lib/device-detection";
import { createSixDigitCode, emailVerificationTtlMs, ensureEmailVerificationSchema, sendVerificationEmail, verificationId } from "../../../lib/email-verification";
import { buildDeviceCookie } from "../../../lib/trusted-device";
import { safeBindValues, safeNullableText, safeText } from "../_d1-utils";
import { ensureStaffDeviceSchema } from "../admin/staff";
import { normalizeOfficePcType, type DeviceOwnerType } from "../../../lib/office-pc-policy";

type Env = {
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  DB: any;
};

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method !== "POST") return Response.json({ error: "Method not allowed." }, { status: 405 });

  const body = (await request.json().catch(() => ({}))) as {
    email?: string;
    deviceId?: string;
    device_id?: string;
    name?: string;
    position?: string;
    deviceAlias?: string;
    deviceModel?: string;
    deviceOwnerType?: DeviceOwnerType;
    device_owner_type?: DeviceOwnerType;
    officePcType?: string;
    office_pc_type?: string;
    location?: string;
  };
  const email = normalizeEmail(String(body.email || ""));
  if (!email) return Response.json({ error: "이메일이 필요합니다." }, { status: 400 });
  const ownerType: DeviceOwnerType = body.deviceOwnerType === "office_pc" || body.device_owner_type === "office_pc" ? "office_pc" : "personal";
  const officePcType = ownerType === "office_pc" ? normalizeOfficePcType(body.officePcType || body.office_pc_type) : "";
  if (ownerType === "office_pc" && !officePcType) return Response.json({ error: "사무실 PC 구분이 필요합니다." }, { status: 400 });

  const deviceId = safeText(body.deviceId || body.device_id || readCookie(request.headers.get("Cookie"), "rentflow_device_id") || crypto.randomUUID());
  const userAgent = request.headers.get("User-Agent") || "";
  const deviceType = detectDeviceType(userAgent);
  const now = new Date();
  const nowIso = now.toISOString();
  const code = createSixDigitCode();
  const expiresAt = new Date(now.getTime() + emailVerificationTtlMs).toISOString();

  try {
    await ensureStaffDeviceSchema(env.DB);
    await ensureEmailVerificationSchema(env.DB);
    const staff = await env.DB.prepare("SELECT id, name, position, role, status FROM users WHERE lower(email) = ?").bind(email).first();
    if (!staff) return Response.json({ error: "등록되지 않은 직원 이메일입니다." }, { status: 403 });
    if (staff.status === "퇴사") return Response.json({ error: "퇴사 상태 직원은 기기 등록을 할 수 없습니다." }, { status: 403 });
    if (ownerType === "personal") {
      const existingPersonal = await env.DB.prepare(
        `SELECT id, device_id FROM devices
         WHERE user_id = ? AND device_owner_type = 'personal' AND status != '차단' AND device_id != ?
         LIMIT 1`,
      ).bind(staff.id, deviceId).first();
      if (existingPersonal?.id) return Response.json({ error: "개인 휴대폰/태블릿은 직원 이메일 1개당 1대만 등록할 수 있습니다." }, { status: 409 });
    } else {
      const existingOfficePc = await env.DB.prepare(
        `SELECT id, device_id FROM devices
         WHERE office_pc_type = ? AND device_owner_type = 'office_pc' AND status != '차단' AND device_id != ?
         LIMIT 1`,
      ).bind(officePcType, deviceId).first();
      if (existingOfficePc?.id) return Response.json({ error: "해당 사무실 PC는 이미 등록되어 있습니다." }, { status: 409 });
    }
    await upsertRegistrationDevice(env.DB, {
      deviceId,
      deviceAlias: body.deviceAlias || body.name || "",
      deviceModel: body.deviceModel || "",
      deviceType,
      ownerType,
      officePcType,
      location: body.location || "",
      email,
      userId: ownerType === "personal" ? String(staff.id || "") : "",
      userAgent,
      now: nowIso,
    });
    await env.DB.prepare(
      `INSERT OR REPLACE INTO email_verification_codes (id, email, device_id, code, expires_at, used_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, NULL, COALESCE((SELECT created_at FROM email_verification_codes WHERE id = ?), ?), ?)`,
    ).bind(...safeBindValues([verificationId(email, deviceId), email, deviceId, code, expiresAt, verificationId(email, deviceId), nowIso, nowIso])).run();
    await sendVerificationEmail({ apiKey: env.RESEND_API_KEY, from: env.EMAIL_FROM, to: email, code });
  } catch (error) {
    console.error("verification email send failed", { error: error instanceof Error ? error.message : String(error) });
    return Response.json({ error: "이메일 발송에 실패했습니다." }, { status: 502 });
  }

  const url = new URL(request.url);
  return Response.json(
    { ok: true, message: "인증코드를 이메일로 발송했습니다.", deviceId },
    { headers: { "Set-Cookie": buildDeviceCookie(deviceId, url.protocol === "https:") } },
  );
};

async function upsertRegistrationDevice(
  db: any,
  input: { deviceId: string; deviceAlias: string; deviceModel: string; deviceType: string; ownerType: DeviceOwnerType; officePcType: string; location: string; email: string; userId: string; userAgent: string; now: string },
) {
  const existing = await db.prepare("SELECT id, status FROM devices WHERE device_id = ?").bind(input.deviceId).first();
  if (existing?.id) {
    const status = existing.status === "승인" || existing.status === "차단" ? existing.status : "이메일인증대기";
    await db.prepare(
      `UPDATE devices
       SET user_id = ?, device_alias = ?, device_model = ?, device_type = ?, device_owner_type = ?, office_pc_type = ?, location = ?, browser = ?, email = ?, status = ?, updated_at = ?
       WHERE device_id = ?`,
    ).bind(...safeBindValues([
      input.ownerType === "personal" ? safeNullableText(input.userId) : null,
      safeNullableText(input.deviceAlias),
      safeNullableText(input.deviceModel),
      input.deviceType,
      input.ownerType,
      safeNullableText(input.officePcType),
      safeNullableText(input.location),
      input.userAgent,
      input.email,
      status,
      input.now,
      input.deviceId,
    ])).run();
    return;
  }
  await db.prepare(
    `INSERT INTO devices (id, user_id, device_id, device_alias, device_model, device_type, device_owner_type, office_pc_type, location, os, browser, email, status, created_at, updated_at, last_seen_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(...safeBindValues([
    crypto.randomUUID(),
    input.ownerType === "personal" ? safeNullableText(input.userId) : null,
    input.deviceId,
    safeNullableText(input.deviceAlias),
    safeNullableText(input.deviceModel),
    input.deviceType,
    input.ownerType,
    safeNullableText(input.officePcType),
    safeNullableText(input.location),
    "",
    input.userAgent,
    input.email,
    "이메일인증대기",
    input.now,
    input.now,
    null,
  ])).run();
}
