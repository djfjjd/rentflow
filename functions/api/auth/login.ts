import { buildSessionCookie, createAuthToken, normalizeEmail } from "../../../lib/auth/jwt";
import { ensureStaffDeviceSchema } from "../admin/staff";
import type { Role } from "../../../lib/auth/roles";
import { writeAuditLog } from "../../../lib/audit-logs";
import { safeText } from "../_d1-utils";
import { buildDeviceCookie, buildTrustedDeviceCookie, createTrustedDeviceToken, readDeviceId } from "../../../lib/trusted-device";

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
  if (!account || !account.password || password !== account.password) {
    await recordLoginLog(env, request, { email, deviceId, status: "failure", message: "invalid credentials" });
    return Response.json({ error: "인증 정보가 올바르지 않습니다." }, { status: 401 });
  }
  if (account.isDeveloper && !account.email) {
    return Response.json({ error: "ADMIN_EMAIL is not configured." }, { status: 500 });
  }

  const url = new URL(request.url);
  if (account.isDeveloper) {
    const token = await createAuthToken({ email: account.email, role: account.role, isDeveloper: true, displayName: "개발자", position: "개발자" }, jwtSecret);
    await recordLoginLog(env, request, { email: account.email, role: account.role, status: "success", message: "developer login success" });
    return Response.json(
      { user: { email: account.email, role: account.role, isDeveloper: true, displayName: "개발자", position: "개발자" }, redirectTo: account.redirectTo },
      { headers: { "Set-Cookie": buildSessionCookie(token, url.protocol === "https:") } },
    );
  }

  // 임시 운영 모드이며 정식 운영 전 BYPASS_DEVICE_APPROVAL=false로 변경해야 함.
  if (isDeviceApprovalBypassed(env)) {
    email = temporarySessionEmail(accountType, account);
    const token = await createAuthToken({ email, role: account.role, isDeveloper: false, displayName: account.displayName, position: account.position }, jwtSecret);
    await recordLoginLog(env, request, { email, role: account.role, deviceId, status: "success", message: "temporary bypass login success" });
    return Response.json(
      { user: { email, role: account.role, isDeveloper: false, displayName: account.displayName, position: account.position }, redirectTo: account.redirectTo },
      { headers: { "Set-Cookie": buildSessionCookie(token, url.protocol === "https:") } },
    );
  }

  const device = await getDeviceByDeviceId(env.DB, deviceId);
  if (!device || device.status === "승인대기") {
    return Response.json(
      { requiresDeviceRegistration: true, redirectTo: "/auth/register-device", deviceId },
      { status: 202, headers: { "Set-Cookie": buildDeviceCookie(deviceId, url.protocol === "https:") } },
    );
  }
  if (device?.status === "차단") {
    await recordLoginLog(env, request, { email, role: account.role, deviceId, status: "failure", message: "blocked device" });
    return Response.json({ error: "차단된 기기입니다. 관리자에게 문의해주세요." }, { status: 403 });
  }

  email = account.isDeveloper ? account.email : normalizeEmail(String(device.email || account.email || ""));
  const isDeveloper = account.isDeveloper;
  const role = account.role;
  const token = await createAuthToken({ email, role, isDeveloper, deviceId }, jwtSecret);
  const trustedToken = await createTrustedDeviceToken(deviceId, request.headers.get("User-Agent") || "", jwtSecret);
  await createSessionRecord(env.DB, device.id, device.user_id || "", deviceId);
  await env.DB.prepare("UPDATE devices SET trusted = 1, auto_login = 1, last_seen_at = ?, updated_at = ? WHERE id = ?").bind(new Date().toISOString(), new Date().toISOString(), safeText(device.id)).run();
  await recordLoginLog(env, request, { email, role, deviceId, status: "success", message: "login success" });
  return Response.json(
    { user: { email, role, isDeveloper }, redirectTo: account.redirectTo },
    {
      headers: [
        ["Set-Cookie", buildSessionCookie(token, url.protocol === "https:")],
        ["Set-Cookie", buildDeviceCookie(deviceId, url.protocol === "https:")],
        ["Set-Cookie", buildTrustedDeviceCookie(trustedToken, url.protocol === "https:")],
      ],
    },
  );
};

function getPasswordAccount(accountType: string, env: Env): { password: string; role: Role; redirectTo: string; email: string; isDeveloper: boolean; displayName: string; position: string } | null {
  if (accountType === "admin") {
    return { password: String(env.ADMIN_PASSWORD || ""), role: "super_admin", redirectTo: "/admin", email: firstTeamLeadEmail(env), isDeveloper: false, displayName: "관리자", position: "관리자" };
  }
  if (accountType === "developer") {
    return { password: String(env.DEVELOPER_PASSWORD || ""), role: "super_admin", redirectTo: "/admin", email: normalizeEmail(env.ADMIN_EMAIL || ""), isDeveloper: true, displayName: "개발자", position: "개발자" };
  }
  if (accountType === "manager") {
    return { password: String(env.MANAGER_PASSWORD || ""), role: "manager", redirectTo: "/admin/dispatches", email: "", isDeveloper: false, displayName: "실장님", position: "실장" };
  }
  if (accountType === "staff") {
    return { password: String(env.STAFF_PASSWORD || ""), role: "staff", redirectTo: "/app/dashboard", email: "", isDeveloper: false, displayName: "직원", position: "직원" };
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

async function getDeviceByDeviceId(db: any, deviceId: string) {
  if (!db) return null;
  await ensureStaffDeviceSchema(db);
  return db.prepare("SELECT devices.*, users.role AS user_role, users.position AS user_position, users.name AS user_name FROM devices LEFT JOIN users ON users.id = devices.user_id WHERE device_id = ?").bind(safeText(deviceId)).first();
}

async function createSessionRecord(db: any, deviceRowId: string, userId: string, publicDeviceId: string) {
  if (!db) return;
  const now = new Date();
  const expires = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 180);
  await db.prepare(
    `INSERT INTO sessions (id, user_id, device_id, status, created_at, expires_at)
     VALUES (?, ?, ?, 'active', ?, ?)`,
  ).bind(crypto.randomUUID(), userId || publicDeviceId, safeText(deviceRowId), now.toISOString(), expires.toISOString()).run();
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
