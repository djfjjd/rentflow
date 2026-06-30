import { normalizeEmail, readCookie } from "../../../lib/auth/jwt";
import { ensureEmailVerificationSchema, verificationId } from "../../../lib/email-verification";
import { writeAuditLog } from "../../../lib/audit-logs";
import { safeText } from "../_d1-utils";
import { ensureStaffDeviceSchema } from "../admin/staff";

type Env = {
  DB: any;
};

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method !== "POST") return Response.json({ error: "Method not allowed." }, { status: 405 });
  const body = (await request.json().catch(() => ({}))) as { email?: string; code?: string; deviceId?: string; device_id?: string };
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
  await env.DB.prepare("UPDATE email_verification_codes SET used_at = ?, updated_at = ? WHERE id = ?").bind(now, now, verificationId(email, deviceId)).run();
  await env.DB.prepare(
    `UPDATE devices
     SET status = 'email_verified_pending', email = ?, updated_at = ?
     WHERE device_id = ? AND status NOT IN ('차단', '승인')`,
  ).bind(email, now, deviceId).run();
  await writeAuditLog(env.DB, { event: "device_registered", actorEmail: email, targetId: deviceId, metadata: { status: "email_verified_pending" } });
  return Response.json({ ok: true, redirectTo: "/auth/pending" });
};
