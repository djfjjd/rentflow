import { authCookieName, readCookie, verifyAuthToken, type AuthSession } from "../../lib/auth/jwt";
import { hasPermission, hasStoredPermissionLevel, type MatrixPermissionKey, type PermissionKey, type PermissionLevel } from "../../lib/permissions";

type PermissionEnv = {
  JWT_SECRET?: string;
  DB?: any;
};

export async function requirePermission(request: Request, env: PermissionEnv, key: PermissionKey) {
  const session = await getApiSession(request, env);
  if (!session) return { response: Response.json({ error: "인증이 필요합니다." }, { status: 401 }) };
  const matrixRequirement = legacyPermissionRequirement(key);
  if (env.DB && matrixRequirement) {
    if (!await hasStoredPermissionLevel(env.DB, session, matrixRequirement.key, matrixRequirement.level)) {
      return { response: Response.json({ error: "권한이 없습니다." }, { status: 403 }), session };
    }
    return { session };
  }
  if (!hasPermission(session.role, key)) return { response: Response.json({ error: "권한이 없습니다." }, { status: 403 }), session };
  return { session };
}

export async function requirePermissionLevel(request: Request, env: PermissionEnv, key: MatrixPermissionKey, level: PermissionLevel) {
  const session = await getApiSession(request, env);
  if (!session) return { response: Response.json({ error: "인증이 필요합니다." }, { status: 401 }) };
  if (!env.DB || !await hasStoredPermissionLevel(env.DB, session, key, level)) {
    return { response: Response.json({ error: "권한이 없습니다." }, { status: 403 }), session };
  }
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

function legacyPermissionRequirement(key: PermissionKey): { key: MatrixPermissionKey; level: PermissionLevel } | null {
  switch (key) {
    case "dispatch.create":
      return { key: "dispatch.manage", level: "read" };
    case "dispatch.update":
    case "dispatch.delete":
      return { key: "dispatch.manage", level: "write" };
    case "reservations.create":
      return { key: "reservations.view", level: "read" };
    case "reservations.update":
    case "reservations.delete":
      return { key: "reservations.view", level: "write" };
    case "photos.view":
    case "photos.upload":
      return { key: "photos.manage", level: "read" };
    case "photos.update":
    case "photos.delete":
      return { key: "photos.manage", level: "write" };
    default:
      return null;
  }
}
