import { buildSessionCookie, createAuthToken, normalizeEmail } from "../../../lib/auth/jwt";
import { roleForLoginEmail } from "../../../lib/auth/access";

type Env = {
  ADMIN_EMAIL?: string;
  TEAM_LEAD_EMAILS?: string;
  JWT_SECRET?: string;
};

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed." }, { status: 405 });
  }

  const jwtSecret = env.JWT_SECRET || "";
  if (!normalizeEmail(env.ADMIN_EMAIL || "") || !jwtSecret) {
    return Response.json({ error: "Auth environment variables are not configured." }, { status: 500 });
  }

  const body = (await request.json().catch(() => ({}))) as { email?: string };
  const email = normalizeEmail(String(body.email || ""));
  const role = roleForLoginEmail(email, env);
  if (!email || !role) {
    return Response.json({ error: "인증 정보가 올바르지 않습니다." }, { status: 401 });
  }

  const token = await createAuthToken({ email, role }, jwtSecret);
  const url = new URL(request.url);
  return Response.json(
    { user: { email, role } },
    { headers: { "Set-Cookie": buildSessionCookie(token, url.protocol === "https:") } },
  );
};
