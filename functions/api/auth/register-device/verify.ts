import { readCookie } from "../../../../lib/auth/jwt";
import { safeBindValues, safeNullableText, safeText } from "../../_d1-utils";
import { ensureStaffDeviceSchema } from "../../admin/staff";
import { buildSettingsCookie, deviceRegistrationChallengeCookieName, expireSettingsCookie, verifySettingsChallenge } from "../../../../lib/settings-2fa";
import { writeAuditLog } from "../../../../lib/audit-logs";
import { detectDeviceInfo } from "../../../../lib/device-detection";

type Env = {
  JWT_SECRET?: string;
  DB: any;
};

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method !== "POST") return Response.json({ error: "Method not allowed." }, { status: 405 });
  const body = (await request.json().catch(() => ({}))) as {
    name?: string;
    position?: string;
    deviceAlias?: string;
    deviceModel?: string;
    email?: string;
    code?: string;
  };
  const email = safeText(body.email).toLowerCase();
  const code = safeText(body.code).trim();
  const ok = /^\d{6}$/.test(code) && await verifySettingsChallenge(readCookie(request.headers.get("Cookie"), deviceRegistrationChallengeCookieName), code, email, env.JWT_SECRET || "");
  if (!ok) return Response.json({ error: "인증코드가 올바르지 않거나 만료되었습니다." }, { status: 401 });

  await ensureStaffDeviceSchema(env.DB);
  const deviceId = readCookie(request.headers.get("Cookie"), "rentflow_device_id") || crypto.randomUUID();
  const userAgent = request.headers.get("User-Agent") || "";
  const detected = detectDeviceInfo({ userAgent, platform: request.headers.get("Sec-CH-UA-Platform") || "", name: body.name });
  const now = new Date().toISOString();
  const existing = await env.DB.prepare("SELECT id FROM devices WHERE device_id = ?").bind(deviceId).first();
  if (existing?.id) {
    await env.DB.prepare(
      `UPDATE devices SET device_name = ?, device_alias = ?, device_model = ?, device_type = ?, device_scope = 'personal_mobile', device_owner_type = 'personal', os = ?, browser = ?, email = ?, status = 'pending_approval', updated_at = ? WHERE device_id = ?`,
    ).bind(...safeBindValues([safeNullableText(detected.deviceName), safeNullableText(detected.deviceName), safeNullableText(detected.deviceModel), detected.deviceType, detected.os, detected.browser, email, now, deviceId])).run();
  } else {
    await env.DB.prepare(
      `INSERT INTO devices (id, user_id, device_id, device_name, device_alias, device_model, device_type, device_scope, device_owner_type, os, browser, email, status, created_at, updated_at, last_seen_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'personal_mobile', 'personal', ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(...safeBindValues([
      crypto.randomUUID(),
      null,
      deviceId,
      safeNullableText(detected.deviceName),
      safeNullableText(detected.deviceName),
      safeNullableText(detected.deviceModel),
      detected.deviceType,
      detected.os,
      detected.browser,
      email,
      "pending_approval",
      now,
      now,
      null,
    ])).run();
  }
  await writeAuditLog(env.DB, { event: "device_registered", actorEmail: email, targetId: deviceId, metadata: { position: body.position, deviceAlias: body.deviceAlias, deviceModel: body.deviceModel } });

  const url = new URL(request.url);
  return Response.json(
    { ok: true, status: "승인대기" },
    {
      headers: [
        ["Set-Cookie", buildDeviceCookie(deviceId, url.protocol === "https:")],
        ["Set-Cookie", expireSettingsCookie(deviceRegistrationChallengeCookieName)],
      ],
    },
  );
};

function buildDeviceCookie(deviceId: string, secure: boolean) {
  return `rentflow_device_id=${deviceId}; Path=/; Max-Age=${60 * 60 * 24 * 365}; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`;
}
