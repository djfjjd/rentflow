import { emailsFromEnv } from "../../../lib/auth/access";
import { authCookieName, readCookie, verifyAuthToken } from "../../../lib/auth/jwt";

export type AdminApiEnv = {
  ADMIN_EMAIL?: string;
  TEAM_LEAD_EMAILS?: string;
  JWT_SECRET?: string;
  DB: any;
};

export async function requireAdminSession(request: Request, env: AdminApiEnv, access: "read" | "write") {
  const token = readCookie(request.headers.get("Cookie"), authCookieName);
  const session = await verifyAuthToken(token, env.JWT_SECRET || "");
  if (!session) {
    return { response: Response.json({ error: "인증이 필요합니다." }, { status: 401 }) };
  }

  if (access === "read" && (session.role === "super_admin" || session.role === "manager")) {
    return { session };
  }

  const settingsEmails = emailsFromEnv(env, ["ADMIN_EMAIL", "TEAM_LEAD_EMAILS"]);
  if (access === "write" && session.role === "super_admin" && settingsEmails.includes(session.email.toLowerCase())) {
    return { session };
  }

  return { response: Response.json({ error: "권한이 없습니다." }, { status: 403 }) };
}
