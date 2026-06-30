import { normalizeEmail, type AuthSession } from "./jwt";
import type { ProtectedRoute } from "./protected-routes";
import type { Role } from "./roles";
import { hasPermission } from "../permissions";

type AuthEnv = Record<string, unknown>;

export const teamLeadEmailEnvKey = "TEAM_LEAD_EMAILS";

export function emailsFromEnv(env: AuthEnv, keys: string[]) {
  return keys.flatMap((key) => splitEmails(envString(env[key]))).map(normalizeEmail).filter(Boolean);
}

export function roleForLoginEmail(email: string, env: AuthEnv): Role | null {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  if (normalizeEmail(envString(env.ADMIN_EMAIL) || "") === normalized) return "super_admin";
  if (emailsFromEnv(env, [teamLeadEmailEnvKey]).includes(normalized)) return "super_admin";
  return null;
}

export function isRouteAllowedForSession(route: ProtectedRoute, session: AuthSession, env: AuthEnv) {
  if (route.allowedRoles?.length && !route.allowedRoles.includes(session.role)) return false;
  if (route.requiredRole && session.role !== route.requiredRole) return false;
  if (route.requiredPermission && !hasPermission(session.role, route.requiredPermission)) return false;
  if (!route.allowedEmailEnvKeys?.length) return true;
  return emailsFromEnv(env, route.allowedEmailEnvKeys).includes(normalizeEmail(session.email));
}

function splitEmails(value: string | undefined) {
  return (value || "").split(/[,\s;]+/).map((item) => item.trim()).filter(Boolean);
}

function envString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}
