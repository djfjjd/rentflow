import { buildSessionCookie, createAuthToken, normalizeEmail } from "../../../lib/auth/jwt";
import type { Role } from "../../../lib/auth/roles";
import { ensureStaffDeviceSchema } from "../admin/staff";
import { writeAuditLog } from "../../../lib/audit-logs";
import { safeText } from "../_d1-utils";
import { buildDeviceCookie, buildTrustedDeviceCookie, createTrustedDeviceToken, readDeviceId, readTrustedDeviceToken, verifyTrustedDeviceToken } from "../../../lib/trusted-device";
import { detectDeviceType, isDesktopDevice } from "../../../lib/device-detection";

type Env = {
  JWT_SECRET?: string;
  DB: any;
};

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method !== "POST") return Response.json({ error: "Method not allowed." }, { status: 405 });
  const jwtSecret = env.JWT_SECRET || "";
  if (!jwtSecret) return Response.json({ error: "JWT_SECRET is not configured." }, { status: 500 });

  await ensureStaffDeviceSchema(env.DB);
  const userAgent = request.headers.get("User-Agent") || "";
  const deviceType = detectDeviceType(userAgent);
  const cookieHeader = request.headers.get("Cookie");
  const desktopDeviceId = readDeviceId(cookieHeader);
  if (isDesktopDevice(deviceType) && desktopDeviceId) {
    const desktopDevice = await env.DB.prepare("SELECT status FROM devices WHERE device_id = ?").bind(safeText(desktopDeviceId)).first();
    if (desktopDevice?.status === "승인") {
      await writeAuditLog(env.DB, { event: "auto_login_failed", targetId: desktopDeviceId, metadata: { reason: "desktop auto login disabled" } });
      return Response.json(
        { desktopApproved: true, message: "이 데스크탑 기기는 승인된 기기입니다. 보안을 위해 직책과 비밀번호를 다시 입력해주세요." },
        { status: 409 },
      );
    }
  }

  const deviceId = await verifyTrustedDeviceToken(readTrustedDeviceToken(cookieHeader), userAgent, jwtSecret);
  if (!deviceId) {
    await writeAuditLog(env.DB, { event: "auto_login_failed", metadata: { reason: "invalid trusted device cookie" } });
    return Response.json({ error: "자동 로그인 기기가 아닙니다." }, { status: 401 });
  }
  if (isDesktopDevice(deviceType)) {
    await writeAuditLog(env.DB, { event: "auto_login_failed", targetId: deviceId, metadata: { reason: "desktop auto login disabled" } });
    return Response.json(
      { desktopApproved: true, message: "이 데스크탑 기기는 승인된 기기입니다. 보안을 위해 직책과 비밀번호를 다시 입력해주세요." },
      { status: 409 },
    );
  }

  const device = await env.DB.prepare(
    `SELECT devices.*, users.name AS user_name, users.position AS user_position, users.role AS user_role
     FROM devices
     LEFT JOIN users ON users.id = devices.user_id
     WHERE devices.device_id = ?`,
  ).bind(safeText(deviceId)).first();

  if (!device || device.status !== "승인" || device.device_owner_type === "office_pc" || !device.trusted || !device.auto_login || device.device_type === "desktop") {
    await writeAuditLog(env.DB, { event: "auto_login_failed", targetId: deviceId, metadata: { reason: "device not approved or trusted" } });
    return Response.json({ error: device?.status === "차단" ? "차단된 기기입니다." : "자동 로그인이 꺼져 있습니다." }, { status: 403 });
  }

  const role = roleFromDevice(device.user_role);
  const email = normalizeEmail(device.email || "");
  const token = await createAuthToken({ email, role, isDeveloper: false, displayName: device.user_name || "", position: device.user_position || "", deviceId }, jwtSecret);
  const trustedToken = await createTrustedDeviceToken(deviceId, userAgent, jwtSecret);
  const now = new Date().toISOString();
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 180).toISOString();
  await env.DB.prepare("UPDATE devices SET last_seen_at = ?, updated_at = ? WHERE id = ?").bind(now, now, safeText(device.id)).run();
  await env.DB.prepare(
    `INSERT INTO sessions (id, user_id, device_id, status, created_at, expires_at)
     VALUES (?, ?, ?, 'active', ?, ?)`,
  ).bind(crypto.randomUUID(), device.user_id || deviceId, safeText(device.id), now, expires).run();
  await writeAuditLog(env.DB, { event: "auto_login_success", actorEmail: email, targetId: deviceId, metadata: { role } });

  const url = new URL(request.url);
  return Response.json(
    { user: { email, role, isDeveloper: false, displayName: device.user_name || "", position: device.user_position || "" }, redirectTo: redirectForRole(role) },
    {
      headers: [
        ["Set-Cookie", buildSessionCookie(token, url.protocol === "https:")],
        ["Set-Cookie", buildDeviceCookie(deviceId, url.protocol === "https:")],
        ["Set-Cookie", buildTrustedDeviceCookie(trustedToken, url.protocol === "https:")],
      ],
    },
  );
};

function redirectForRole(role: string) {
  if (role === "super_admin") return "/admin";
  if (role === "manager") return "/admin/dispatches";
  return "/app";
}

function roleFromDevice(value: unknown): Role {
  return value === "super_admin" || value === "manager" || value === "staff" ? value : "staff";
}
