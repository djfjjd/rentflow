import { authCookieName, readCookie, verifyAuthToken } from "../lib/auth/jwt";
import { isRouteAllowedForSession } from "../lib/auth/access";
import { getProtectedRoute } from "../lib/auth/protected-routes";
import { hasSettings2faAccess, isDeveloperSettingsBypass, isSettingsEmailAllowed } from "../lib/settings-2fa";
import { buildDeviceCookie, buildTrustedDeviceCookie, createTrustedDeviceToken, expireTrustedDeviceCookie, readTrustedDeviceToken, verifyTrustedDeviceToken } from "../lib/trusted-device";
import { buildExpiredSessionCookie, buildSessionCookie, createAuthToken, normalizeEmail } from "../lib/auth/jwt";
import { ensureStaffDeviceSchema } from "./api/admin/staff";
import { writeAuditLog } from "../lib/audit-logs";
import type { Role } from "../lib/auth/roles";
import { detectDeviceType, isDesktopDevice } from "../lib/device-detection";
import { hasStoredPermissionLevel } from "../lib/permissions";

type Env = {
  ADMIN_EMAIL?: string;
  TEAM_LEAD_EMAILS?: string;
  JWT_SECRET?: string;
  DB: any;
};

export const onRequest: PagesFunction<Env> = async ({ request, env, next }) => {
  const url = new URL(request.url);
  const token = readCookie(request.headers.get("Cookie"), authCookieName);
  let session = await verifyAuthToken(token, env.JWT_SECRET || "");
  const isDeviceAuthPath = ["/auth/register-device", "/auth/pending", "/auth/verify-email"].some((path) => url.pathname === path || url.pathname.startsWith(`${path}/`));
  if (isDeviceAuthPath && session?.isDeveloper) {
    return Response.redirect(new URL("/admin", url.origin).toString(), 302);
  }

  const route = getProtectedRoute(url.pathname);
  if (!route) return next();

  if (!session) {
    const trustedResponse = await tryTrustedDeviceLogin(request, env, url);
    if (trustedResponse) return trustedResponse;
    const authUrl = new URL("/auth", url.origin);
    authUrl.searchParams.set("next", route.nextPath || `${url.pathname}${url.search}`);
    return Response.redirect(authUrl.toString(), 302);
  }

  if (session.deviceId && !session.isDeveloper) {
    const validDevice = await isSessionDeviceValid(env.DB, session.deviceId);
    if (!validDevice) {
      const authUrl = new URL("/auth", url.origin);
      authUrl.searchParams.set("next", route.nextPath || `${url.pathname}${url.search}`);
      const headers = new Headers({ Location: authUrl.toString() });
      headers.append("Set-Cookie", buildExpiredSessionCookie());
      headers.append("Set-Cookie", expireTrustedDeviceCookie());
      return new Response(null, { status: 302, headers });
    }
  }

  if (route.authenticatedRedirectTo) {
    return Response.redirect(new URL(route.authenticatedRedirectTo, url.origin).toString(), 302);
  }

  if (!isRouteAllowedForSession(route, session, env)) {
    return new Response("권한이 없습니다.", {
      status: 403,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  if (isPartnerAddressPath(url.pathname) && !await hasStoredPermissionLevel(env.DB, session, "partners_address.view", "read")) {
    return new Response("권한이 없습니다.", {
      status: 403,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const isSettingsPath = url.pathname === "/admin/settings" || url.pathname.startsWith("/admin/settings/");
  const isVerifyPath = url.pathname === "/admin/settings/verify" || url.pathname.startsWith("/admin/settings/verify/");
  if (isSettingsPath) {
    if (!isSettingsEmailAllowed(session, env)) {
      return new Response("권한이 없습니다.", {
        status: 403,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }
    const settingsVerified = await hasSettings2faAccess(request.headers.get("Cookie"), session, env);
    if (isVerifyPath && isDeveloperSettingsBypass(session, env)) {
      return Response.redirect(new URL("/admin/settings", url.origin).toString(), 302);
    }
    if (!settingsVerified && !isVerifyPath) {
      const verifyUrl = new URL("/admin/settings/verify", url.origin);
      verifyUrl.searchParams.set("next", `${url.pathname}${url.search}`);
      return Response.redirect(verifyUrl.toString(), 302);
    }
  }

  return next();
};

function isPartnerAddressPath(pathname: string) {
  return pathname === "/partners" || pathname.startsWith("/partners/") || pathname === "/admin/partners" || pathname.startsWith("/admin/partners/");
}

async function tryTrustedDeviceLogin(request: Request, env: Env, url: URL) {
  if (!env.DB || !env.JWT_SECRET) return null;
  await ensureStaffDeviceSchema(env.DB);
  const userAgent = request.headers.get("User-Agent") || "";
  const deviceType = detectDeviceType(userAgent);
  if (isDesktopDevice(deviceType)) {
    const desktopDeviceId = buildDeviceIdFromCookie(request.headers.get("Cookie"));
    if (desktopDeviceId) {
      await writeAuditLog(env.DB, { event: "auto_login_failed", targetId: desktopDeviceId, metadata: { reason: "desktop auto login disabled" } });
    }
    return null;
  }
  const deviceId = await verifyTrustedDeviceToken(readTrustedDeviceToken(request.headers.get("Cookie")), userAgent, env.JWT_SECRET);
  if (!deviceId) return null;
  const device = await env.DB.prepare(
    `SELECT devices.*, users.name AS user_name, users.position AS user_position, users.role AS user_role
     FROM devices
     LEFT JOIN users ON users.id = devices.user_id
     WHERE devices.device_id = ?`,
  ).bind(deviceId).first();
  if (!device || device.status !== "승인" || device.device_owner_type === "office_pc" || !device.trusted || !device.auto_login || device.device_type === "desktop") {
    await writeAuditLog(env.DB, { event: "auto_login_failed", targetId: deviceId });
    return null;
  }
  const role = roleFromDevice(device.user_role);
  const email = normalizeEmail(device.email || "");
  const authToken = await createAuthToken({ email, role, isDeveloper: false, displayName: device.user_name || "", position: device.user_position || "", deviceId }, env.JWT_SECRET);
  const trustedToken = await createTrustedDeviceToken(deviceId, userAgent, env.JWT_SECRET);
  const now = new Date().toISOString();
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 180).toISOString();
  await env.DB.prepare("UPDATE devices SET last_seen_at = ?, updated_at = ? WHERE id = ?").bind(now, now, device.id).run();
  await env.DB.prepare(
    `INSERT INTO sessions (id, user_id, device_id, status, created_at, expires_at)
     VALUES (?, ?, ?, 'active', ?, ?)`,
  ).bind(crypto.randomUUID(), device.user_id || deviceId, device.id, now, expires).run();
  await writeAuditLog(env.DB, { event: "auto_login_success", actorEmail: email, targetId: deviceId, metadata: { role } });
  const headers = new Headers({ Location: url.toString() });
  headers.append("Set-Cookie", buildSessionCookie(authToken, url.protocol === "https:"));
  headers.append("Set-Cookie", buildDeviceCookie(deviceId, url.protocol === "https:"));
  headers.append("Set-Cookie", buildTrustedDeviceCookie(trustedToken, url.protocol === "https:"));
  return new Response(null, { status: 302, headers });
}

function buildDeviceIdFromCookie(cookieHeader: string | null) {
  return readCookie(cookieHeader, "rentflow_device_id");
}

function roleFromDevice(value: unknown): Role {
  return value === "super_admin" || value === "manager" || value === "staff" ? value : "staff";
}

async function isSessionDeviceValid(db: any, deviceId: string) {
  if (!db) return true;
  await ensureStaffDeviceSchema(db);
  const device = await db.prepare("SELECT status FROM devices WHERE device_id = ?").bind(deviceId).first();
  return Boolean(device && device.status === "승인");
}
