import { buildSessionCookie, createAuthToken, normalizeEmail } from "../../../lib/auth/jwt";

type Env = {
  ADMIN_EMAIL?: string;
  JWT_SECRET?: string;
};

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed." }, { status: 405 });
  }

  const adminEmail = normalizeEmail(env.ADMIN_EMAIL || "");
  const jwtSecret = env.JWT_SECRET || "";
  if (!adminEmail || !jwtSecret) {
    return Response.json({ error: "Auth environment variables are not configured." }, { status: 500 });
  }

  const body = (await request.json().catch(() => ({}))) as { email?: string };
  const email = normalizeEmail(String(body.email || ""));
  if (!email || email !== adminEmail) {
    return Response.json({ error: "인증 정보가 올바르지 않습니다." }, { status: 401 });
  }

  const token = await createAuthToken({ email, role: "super_admin" }, jwtSecret);
  const url = new URL(request.url);
  return Response.json(
    { user: { email, role: "super_admin" } },
    { headers: { "Set-Cookie": buildSessionCookie(token, url.protocol === "https:") } },
  );
};
