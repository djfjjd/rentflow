import { authCookieName, readCookie, verifyAuthToken } from "../../../lib/auth/jwt";
import { isSettingsEmailAllowed, settings2faCookieName, verifySettings2faCookie } from "../../../lib/settings-2fa";

export type AdminApiEnv = {
  ADMIN_EMAIL?: string;
  TEAM_LEAD_EMAILS?: string;
  JWT_SECRET?: string;
  DB: any;
};

export async function requireAdminSession(request: Request, env: AdminApiEnv, _access: "read" | "write") {
  const token = readCookie(request.headers.get("Cookie"), authCookieName);
  const session = await verifyAuthToken(token, env.JWT_SECRET || "");
  if (!session) {
    return { response: Response.json({ error: "인증이 필요합니다." }, { status: 401 }) };
  }

  if (session.role === "super_admin") {
    if (!isSettingsEmailAllowed(session, env)) {
      return { response: Response.json({ error: "권한이 없습니다." }, { status: 403 }) };
    }
    const verified = await verifySettings2faCookie(readCookie(request.headers.get("Cookie"), settings2faCookieName), session.email, env.JWT_SECRET || "");
    if (!verified) {
      return { response: Response.json({ error: "설정센터 2단계 인증이 필요합니다.", code: "settings_2fa_required" }, { status: 403 }) };
    }
    return { session };
  }

  return { response: Response.json({ error: "권한이 없습니다." }, { status: 403 }) };
}
