import { buildSessionCookie, createAuthToken, normalizeEmail } from "../../../lib/auth/jwt";
import { ensureStaffDeviceSchema } from "../admin/staff";
import type { Role } from "../../../lib/auth/roles";
import { writeAuditLog } from "../../../lib/audit-logs";

type Env = {
  ADMIN_EMAIL?: string;
  TEAM_LEAD_EMAILS?: string;
  ADMIN_LOGIN_ID?: string;
  ADMIN_LOGIN_PASSWORD?: string;
  MANAGER_LOGIN_ID?: string;
  MANAGER_LOGIN_PASSWORD?: string;
  STAFF_LOGIN_ID?: string;
  STAFF_LOGIN_PASSWORD?: string;
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

  const body = (await request.json().catch(() => ({}))) as { accountType?: string; email?: string; loginId?: string; login_id?: string; password?: string; deviceId?: string; device_id?: string };
  const accountType = String(body.accountType || "");
  const email = normalizeEmail(String(body.email || ""));
  const loginId = String(body.loginId || body.login_id || "");
  const password = String(body.password || "");
  const deviceId = String(body.deviceId || body.device_id || "");
  const account = getPasswordAccount(accountType, env);
  if (!email || !account || loginId !== account.loginId || password !== account.password) {
    await recordLoginLog(env, request, { email, loginId, deviceId, status: "failure", message: "invalid credentials" });
    return Response.json({ error: "인증 정보가 올바르지 않습니다." }, { status: 401 });
  }

  const isDeveloper = email === normalizeEmail(env.ADMIN_EMAIL || "");
  const role = account.role;
  const token = await createAuthToken({ email, role, isDeveloper }, jwtSecret);
  await recordLoginLog(env, request, { email, loginId, role, deviceId, status: "success", message: "login success" });
  const url = new URL(request.url);
  return Response.json(
    { user: { email, role, isDeveloper }, redirectTo: account.redirectTo },
    { headers: { "Set-Cookie": buildSessionCookie(token, url.protocol === "https:") } },
  );
};

function getPasswordAccount(accountType: string, env: Env): { loginId: string; password: string; role: Role; redirectTo: string } | null {
  if (accountType === "admin") {
    return { loginId: String(env.ADMIN_LOGIN_ID || ""), password: String(env.ADMIN_LOGIN_PASSWORD || ""), role: "super_admin", redirectTo: "/admin" };
  }
  if (accountType === "manager") {
    return { loginId: String(env.MANAGER_LOGIN_ID || ""), password: String(env.MANAGER_LOGIN_PASSWORD || ""), role: "manager", redirectTo: "/app/dashboard" };
  }
  if (accountType === "staff") {
    return { loginId: String(env.STAFF_LOGIN_ID || ""), password: String(env.STAFF_LOGIN_PASSWORD || ""), role: "staff", redirectTo: "/app/dashboard" };
  }
  return null;
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
