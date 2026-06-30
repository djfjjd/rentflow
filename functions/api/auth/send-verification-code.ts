import { normalizeEmail, readCookie } from "../../../lib/auth/jwt";
import { detectDeviceType } from "../../../lib/device-detection";
import { createSixDigitCode, emailVerificationTtlMs, ensureEmailVerificationSchema, sendVerificationEmail, verificationId } from "../../../lib/email-verification";
import { buildDeviceCookie } from "../../../lib/trusted-device";
import { safeBindValues, safeNullableText, safeText } from "../_d1-utils";
import { ensureStaffDeviceSchema } from "../admin/staff";

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
  };
  const email = normalizeEmail(String(body.email || ""));
  if (!email) return Response.json({ error: "이메일이 필요합니다." }, { status: 400 });

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
    await upsertRegistrationDevice(env.DB, {
      deviceId,
      deviceAlias: body.deviceAlias || body.name || "",
      deviceModel: body.deviceModel || "",
      deviceType,
      email,
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
  input: { deviceId: string; deviceAlias: string; deviceModel: string; deviceType: string; email: string; userAgent: string; now: string },
) {
  const existing = await db.prepare("SELECT id, status FROM devices WHERE device_id = ?").bind(input.deviceId).first();
  if (existing?.id) {
    const status = existing.status === "승인" || existing.status === "차단" ? existing.status : "이메일인증대기";
    await db.prepare(
      `UPDATE devices
       SET device_alias = ?, device_model = ?, device_type = ?, browser = ?, email = ?, status = ?, updated_at = ?
       WHERE device_id = ?`,
    ).bind(...safeBindValues([
      safeNullableText(input.deviceAlias),
      safeNullableText(input.deviceModel),
      input.deviceType,
      input.userAgent,
      input.email,
      status,
      input.now,
      input.deviceId,
    ])).run();
    return;
  }
  await db.prepare(
    `INSERT INTO devices (id, user_id, device_id, device_alias, device_model, device_type, os, browser, email, status, created_at, updated_at, last_seen_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(...safeBindValues([
    crypto.randomUUID(),
    null,
    input.deviceId,
    safeNullableText(input.deviceAlias),
    safeNullableText(input.deviceModel),
    input.deviceType,
    "",
    input.userAgent,
    input.email,
    "이메일인증대기",
    input.now,
    input.now,
    null,
  ])).run();
}
