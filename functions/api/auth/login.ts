import { buildBrowserSessionCookie, buildSessionCookie, createAuthToken, normalizeEmail } from "../../../lib/auth/jwt";
import { ensureStaffDeviceSchema } from "../admin/staff";
import type { Role } from "../../../lib/auth/roles";
import { writeAuditLog } from "../../../lib/audit-logs";
import { safeText } from "../_d1-utils";
import { buildDeviceCookie, buildTrustedDeviceCookie, createTrustedDeviceToken, expireTrustedDeviceCookie, readDeviceId } from "../../../lib/trusted-device";
import { detectDeviceType, isDesktopDevice, type DeviceType } from "../../../lib/device-detection";
import { officePcLabel, officePcTypeToRole, roleAllowedForOfficePc } from "../../../lib/office-pc-policy";

type Env = {
  ADMIN_EMAIL?: string;
  TEAM_LEAD_EMAILS?: string;
  DEVELOPER_PASSWORD?: string;
  ADMIN_PASSWORD?: string;
  MANAGER_PASSWORD?: string;
  STAFF_PASSWORD?: string;
  BYPASS_DEVICE_APPROVAL?: string;
  JWT_SECRET?: string;
  DB: any;
};

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed." }, { status: 405 });
  }

  const jwtSecret = env.JWT_SECRET || "";
  if (!jwtSecret) {
    return Response.json({ error: "Auth environment variables are not configured." }, { status: 500 });
  }

  const body = (await request.json().catch(() => ({}))) as { accountType?: string; password?: string; deviceId?: string; device_id?: string };
  const accountType = String(body.accountType || "");
  const password = String(body.password || "");
  const deviceId = String(body.deviceId || body.device_id || readDeviceId(request.headers.get("Cookie")) || crypto.randomUUID());
  const account = getPasswordAccount(accountType, env);
  let email = account?.email || "";
  if (!account) {
    await recordLoginLog(env, request, { email, deviceId, status: "failure", message: "unknown account type" });
    return Response.json({ error: "인증 정보가 올바르지 않습니다." }, { status: 401 });
  }
  if (!account.password || password !== account.password) {
    await recordLoginLog(env, request, { email, role: account.role, deviceId, status: "failure", message: "password mismatch" });
    return Response.json({ error: "비밀번호가 일치하지 않습니다." }, { status: 401 });
  }
  if (account.isDeveloper && !account.email) {
    return Response.json({ error: "ADMIN_EMAIL is not configured." }, { status: 500 });
  }

  const url = new URL(request.url);
  const userAgent = request.headers.get("User-Agent") || "";
  const deviceType = detectDeviceType(userAgent);
  if (account.isDeveloper) {
    const token = await createAuthToken({ email: account.email, role: account.role, isDeveloper: true, displayName: "개발자", position: "개발자" }, jwtSecret);
    await recordLoginLog(env, request, { email: account.email, role: account.role, status: "success", message: "developer login success" });
    return Response.json(
      { user: { email: account.email, role: account.role, isDeveloper: true, displayName: "개발자", position: "개발자" }, redirectTo: getDefaultRedirectPath({ role: account.role, isDeveloper: true }, deviceType) },
      { headers: { "Set-Cookie": buildSessionCookie(token, url.protocol === "https:") } },
    );
  }

  // 임시 운영 모드이며 정식 운영 전 BYPASS_DEVICE_APPROVAL=false로 변경해야 함.
  if (isDeviceApprovalBypassed(env)) {
    email = temporarySessionEmail(accountType, account);
    const token = await createAuthToken({ email, role: account.role, isDeveloper: false, displayName: account.displayName, position: account.position }, jwtSecret);
    await recordLoginLog(env, request, { email, role: account.role, deviceId, status: "success", message: "temporary bypass login success" });
    return Response.json(
      { user: { email, role: account.role, isDeveloper: false, displayName: account.displayName, position: account.position }, redirectTo: getDefaultRedirectPath({ role: account.role, isDeveloper: false }, deviceType) },
      { headers: { "Set-Cookie": buildSessionCookie(token, url.protocol === "https:") } },
    );
  }

  const device = await getDeviceByDeviceId(env.DB, deviceId);
  if (!device || device.status !== "승인") {
    return Response.json(
      {
        requiresDeviceRegistration: true,
        redirectTo: "/auth/register-device",
        deviceId,
        error: loginFailureMessage("device_not_approved", { deviceId, deviceStatus: device?.status }),
      },
      { status: 202, headers: { "Set-Cookie": buildDeviceCookie(deviceId, url.protocol === "https:") } },
    );
  }

  email = account.isDeveloper ? account.email : normalizeEmail(String(device.email || account.email || temporarySessionEmail(accountType, account)));
  const isDeveloper = account.isDeveloper;
  const role = effectiveDeviceRole(device);
  if (!role) {
    await recordLoginLog(env, request, { email, role: account.role, deviceId, status: "failure", message: "unknown office pc type" });
    return Response.json({ error: loginFailureMessage("unknown_office_pc_type", { officePcType: device.office_pc_type, deviceId }) }, { status: 403 });
  }
  if (account.role !== role) {
    await recordLoginLog(env, request, { email, role: account.role, deviceId, status: "failure", message: "role not allowed for device" });
    return Response.json({ error: loginFailureMessage("role_not_allowed", { allowedRole: role, requestedRole: account.role, deviceId }) }, { status: 403 });
  }
  if (device.device_owner_type === "office_pc" && !roleAllowedForOfficePc(String(device.office_pc_type || ""), account.role)) {
    await recordLoginLog(env, request, { email, role: account.role, deviceId, status: "failure", message: "office pc role not allowed" });
    return Response.json({ error: loginFailureMessage("office_pc_role_not_allowed", { allowedRole: role, requestedRole: account.role, deviceId }) }, { status: 403 });
  }
  const displayName = device.device_owner_type === "office_pc" ? officePcLabel(String(device.office_pc_type || "")) : device.user_name || account.displayName;
  const position = device.device_owner_type === "office_pc" ? displayName : device.user_position || account.position;
  const token = await createAuthToken({ email, role, isDeveloper, displayName, position, deviceId }, jwtSecret);
  await createSessionRecord(env.DB, device.id, device.user_id || "", deviceId, email);
  const autoLogin = device.device_owner_type === "office_pc" || isDesktopDevice(deviceType) ? 0 : 1;
  await env.DB.prepare("UPDATE devices SET device_type = ?, trusted = ?, auto_login = ?, last_seen_at = ?, updated_at = ? WHERE id = ?").bind(deviceType, autoLogin ? 1 : 0, autoLogin, new Date().toISOString(), new Date().toISOString(), safeText(device.id)).run();
  await recordLoginLog(env, request, { email, role, deviceId, status: "success", message: "login success" });
  const headers: [string, string][] = [
    ["Set-Cookie", isDesktopDevice(deviceType) ? buildBrowserSessionCookie(token, url.protocol === "https:") : buildSessionCookie(token, url.protocol === "https:")],
    ["Set-Cookie", buildDeviceCookie(deviceId, url.protocol === "https:")],
  ];
  if (!autoLogin) {
    headers.push(["Set-Cookie", expireTrustedDeviceCookie()]);
  } else {
    const trustedToken = await createTrustedDeviceToken(deviceId, userAgent, jwtSecret);
    headers.push(["Set-Cookie", buildTrustedDeviceCookie(trustedToken, url.protocol === "https:")]);
  }
  return Response.json(
    { user: { email, role, isDeveloper, displayName, position }, redirectTo: getDefaultRedirectPath({ role, isDeveloper }, deviceType), desktopReauth: isDesktopDevice(deviceType) },
    { headers },
  );
};

function getPasswordAccount(accountType: string, env: Env): { password: string; role: Role; redirectTo: string; email: string; isDeveloper: boolean; displayName: string; position: string } | null {
  if (accountType === "admin") {
    return { password: String(env.ADMIN_PASSWORD || ""), role: "super_admin", redirectTo: "/admin", email: adminAccountEmail(env), isDeveloper: false, displayName: "관리자", position: "관리자" };
  }
  if (accountType === "developer") {
    return { password: String(env.DEVELOPER_PASSWORD || ""), role: "super_admin", redirectTo: "/admin", email: normalizeEmail(env.ADMIN_EMAIL || ""), isDeveloper: true, displayName: "개발자", position: "개발자" };
  }
  if (accountType === "manager") {
    return { password: String(env.MANAGER_PASSWORD || ""), role: "manager", redirectTo: "/admin/dispatches", email: "", isDeveloper: false, displayName: "실장님", position: "실장" };
  }
  if (accountType === "staff") {
    return { password: String(env.STAFF_PASSWORD || ""), role: "staff", redirectTo: "/app", email: "", isDeveloper: false, displayName: "직원", position: "직원" };
  }
  return null;
}

function isDeviceApprovalBypassed(env: Env) {
  return String(env.BYPASS_DEVICE_APPROVAL || "").toLowerCase() === "true";
}

function temporarySessionEmail(accountType: string, account: { email: string }) {
  return account.email || `${accountType}@rentflow.local`;
}

function firstTeamLeadEmail(env: Env) {
  return normalizeEmail(String(env.TEAM_LEAD_EMAILS || "").split(/[,\s;]+/).find(Boolean) || "");
}

function adminAccountEmail(env: Env) {
  return firstTeamLeadEmail(env) || normalizeEmail(env.ADMIN_EMAIL || "");
}

async function getDeviceByDeviceId(db: any, deviceId: string) {
  if (!db) return null;
  await ensureStaffDeviceSchema(db);
  return db.prepare("SELECT devices.*, users.role AS user_role, users.position AS user_position, users.name AS user_name FROM devices LEFT JOIN users ON users.id = devices.user_id WHERE device_id = ?").bind(safeText(deviceId)).first();
}

function effectiveDeviceRole(device: any): Role | "" {
  if (device.device_owner_type === "office_pc") {
    return officePcTypeToRole(device.office_pc_type);
  }
  return device.user_role === "super_admin" || device.user_role === "manager" || device.user_role === "staff" ? device.user_role : "staff";
}

function loginFailureMessage(
  reason: "device_not_approved" | "role_not_allowed" | "office_pc_role_not_allowed" | "unknown_office_pc_type",
  details: { allowedRole?: string; requestedRole?: string; officePcType?: string; deviceId?: string; deviceStatus?: string } = {},
) {
  if (reason === "device_not_approved") {
    const status = details.deviceStatus ? ` 상태: ${details.deviceStatus}.` : " 현재 deviceId와 승인된 deviceId가 다릅니다.";
    return `승인된 사무실 PC가 아닙니다.${status}`;
  }
  if (reason === "unknown_office_pc_type") {
    return `승인된 사무실 PC 구분을 확인할 수 없습니다. PC 구분: ${details.officePcType || "-"}.`;
  }
  if (details.allowedRole === "staff") return "이 PC에서는 직원 계정만 로그인할 수 있습니다.";
  if (details.allowedRole === "manager") return "이 PC에서는 실장님 계정만 로그인할 수 있습니다.";
  if (details.allowedRole === "super_admin") return "이 PC에서는 소장님/팀장님 계정만 로그인할 수 있습니다.";
  return "이 기기에서 선택한 직책으로 로그인할 수 없습니다.";
}

function getDefaultRedirectPath(user: { role: Role; isDeveloper?: boolean }, deviceType: DeviceType) {
  if (!isDesktopDevice(deviceType)) return "/app";
  if (user.isDeveloper || user.role === "super_admin") return "/admin";
  if (user.role === "manager") return "/admin/dispatches";
  return "/app";
}

async function createSessionRecord(db: any, deviceRowId: string, userId: string, publicDeviceId: string, email: string) {
  if (!db) return;
  const now = new Date();
  const expires = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 180);
  const sessionUserId = userId || await findUserIdByEmail(db, email) || await ensureOfficePcSessionUser(db, email || publicDeviceId);
  await db.prepare(
    `INSERT INTO sessions (id, user_id, device_id, status, created_at, expires_at)
     VALUES (?, ?, ?, 'active', ?, ?)`,
  ).bind(crypto.randomUUID(), sessionUserId, safeText(deviceRowId), now.toISOString(), expires.toISOString()).run();
}

async function findUserIdByEmail(db: any, email: string) {
  const normalized = normalizeEmail(email || "");
  if (!normalized) return "";
  const row = await db.prepare("SELECT id FROM users WHERE lower(email) = ? AND COALESCE(status, '') NOT IN ('퇴사', 'deleted') AND deleted_at IS NULL LIMIT 1").bind(normalized).first();
  return safeText(row?.id || "");
}

async function ensureOfficePcSessionUser(db: any, email: string) {
  const normalized = normalizeEmail(email || "office-pc@rentflow.local");
  const loginId = `office_pc_${encodeSessionLoginId(normalized)}`;
  const existing = await db.prepare("SELECT id FROM users WHERE login_id = ? LIMIT 1").bind(loginId).first();
  if (existing?.id) return safeText(existing.id);
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  await db.prepare(
    `INSERT INTO users (id, name, position, role, login_id, password_hash, email, status, created_at, updated_at)
     VALUES (?, '사무실 PC', '사무실 PC', 'staff', ?, '', ?, '재직', ?, ?)`,
  ).bind(id, loginId, normalized, now, now).run();
  return id;
}

function encodeSessionLoginId(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 48) || "device";
}

async function recordLoginLog(
  env: Env,
  request: Request,
  input: { email: string; loginId?: string; role?: string; deviceId?: string; status: "success" | "failure"; message: string },
) {
  try {
    if (!env.DB) return;
    await ensureStaffDeviceSchema(env.DB);
    await env.DB.prepare(
      `INSERT INTO login_logs (id, email, login_id, role, device_id, ip, user_agent, status, message, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      crypto.randomUUID(),
      input.email,
      input.loginId || "",
      input.role || "",
      input.deviceId || "",
      request.headers.get("CF-Connecting-IP") || request.headers.get("x-forwarded-for") || "",
      request.headers.get("User-Agent") || "",
      input.status,
      input.message,
      new Date().toISOString(),
    ).run();
    await writeAuditLog(env.DB, { event: input.status === "success" ? "login_success" : "login_failed", actorEmail: input.email, targetId: input.deviceId, metadata: { loginId: input.loginId, role: input.role, message: input.message } });
  } catch (error) {
    console.error("login log write failed", { error: error instanceof Error ? error.message : String(error) });
  }
}
