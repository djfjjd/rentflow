import { buildExpiredSessionCookie } from "../../../lib/auth/jwt";

export const onRequest: PagesFunction = async ({ request }) => {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed." }, { status: 405 });
  }

  return Response.json({ ok: true }, { headers: { "Set-Cookie": buildExpiredSessionCookie() } });
};
