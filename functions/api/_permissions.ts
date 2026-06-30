import { authCookieName, readCookie, verifyAuthToken, type AuthSession } from "../../lib/auth/jwt";
import { hasPermission, type PermissionKey } from "../../lib/permissions";

type PermissionEnv = {
  JWT_SECRET?: string;
};

export async function requirePermission(request: Request, env: PermissionEnv, key: PermissionKey) {
  const session = await getApiSession(request, env);
  if (!session) return { response: Response.json({ error: "인증이 필요합니다." }, { status: 401 }) };
  if (!hasPermission(session.role, key)) return { response: Response.json({ error: "권한이 없습니다." }, { status: 403 }), session };
  return { session };
}

export async function getApiSession(request: Request, env: PermissionEnv) {
  const token = readCookie(request.headers.get("Cookie"), authCookieName);
  return verifyAuthToken(token, env.JWT_SECRET || "");
}

export function isStaff(session: AuthSession | null | undefined) {
  return session?.role === "staff";
}

export function isDispatchingStatus(row: any) {
  const status = String(row?.status || row?.dispatch_type || row?.business_type || "").trim();
  const completed = row?.is_completed === 1 || row?.is_completed === true || row?.return_completed === 1 || row?.return_completed === true;
  return !completed && ["보험", "자차", "셀프", "배차", "배차중", "배차등록"].some((value) => status.includes(value));
}

export type { PermissionKey };
