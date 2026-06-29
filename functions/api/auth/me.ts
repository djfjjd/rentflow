import { authCookieName, readCookie, verifyAuthToken } from "../../../lib/auth/jwt";
import { emailsFromEnv } from "../../../lib/auth/access";

type Env = {
  ADMIN_EMAIL?: string;
  TEAM_LEAD_EMAILS?: string;
  JWT_SECRET?: string;
};

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method !== "GET") {
    return Response.json({ error: "Method not allowed." }, { status: 405 });
  }

  const token = readCookie(request.headers.get("Cookie"), authCookieName);
  const session = await verifyAuthToken(token, env.JWT_SECRET || "");
  if (!session) return Response.json({ user: null }, { status: 401 });
  const settingsEmails = emailsFromEnv(env, ["ADMIN_EMAIL", "TEAM_LEAD_EMAILS"]);
  const isDeveloper = Boolean(session.isDeveloper) || session.email.toLowerCase() === String(env.ADMIN_EMAIL || "").trim().toLowerCase();
  return Response.json({
    user: {
      email: session.email,
      role: session.role,
      isDeveloper,
      canAccessSettings: settingsEmails.includes(session.email.toLowerCase()),
    },
  });
};
