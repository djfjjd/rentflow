import { authCookieName, readCookie, verifyAuthToken } from "../../../lib/auth/jwt";

type Env = {
  JWT_SECRET?: string;
};

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method !== "GET") {
    return Response.json({ error: "Method not allowed." }, { status: 405 });
  }

  const token = readCookie(request.headers.get("Cookie"), authCookieName);
  const session = await verifyAuthToken(token, env.JWT_SECRET || "");
  if (!session) return Response.json({ user: null }, { status: 401 });
  return Response.json({ user: { email: session.email, role: session.role } });
};
