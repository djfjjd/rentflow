import { authCookieName, readCookie, verifyAuthToken } from "../../../lib/auth/jwt";
import { getSessionPermissionLevel } from "../../../lib/permissions";

type Env = {
  ADMIN_EMAIL?: string;
  TEAM_LEAD_EMAILS?: string;
  JWT_SECRET?: string;
  DB?: any;
};

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method !== "GET") {
    return Response.json({ error: "Method not allowed." }, { status: 405 });
  }

  const token = readCookie(request.headers.get("Cookie"), authCookieName);
  const session = await verifyAuthToken(token, env.JWT_SECRET || "");
  if (!session) return Response.json({ user: null }, { status: 401 });
  const isDeveloper = Boolean(session.isDeveloper) || session.email.toLowerCase() === String(env.ADMIN_EMAIL || "").trim().toLowerCase();
  const partnersAddressLevel = env.DB ? await getSessionPermissionLevel(env.DB, { ...session, isDeveloper }, "partners_address.view") : "none";
  const dispatchManageLevel = env.DB ? await getSessionPermissionLevel(env.DB, { ...session, isDeveloper }, "dispatch.manage") : "none";
  return Response.json({
    user: {
      email: session.email,
      role: session.role,
      isDeveloper,
      displayName: session.displayName,
      position: session.position,
      canAccessSettings: session.role === "super_admin",
      permissions: {
        "partners_address.view": partnersAddressLevel,
        "dispatch.manage": dispatchManageLevel,
      },
    },
  });
};
