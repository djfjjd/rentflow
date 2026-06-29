import { buildExpiredSessionCookie } from "../../../lib/auth/jwt";
import { expireSettingsCookie, settings2faChallengeCookieName, settings2faCookieName } from "../../../lib/settings-2fa";

export const onRequest: PagesFunction = async ({ request }) => {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed." }, { status: 405 });
  }

  return Response.json(
    { ok: true },
    {
      headers: [
        ["Set-Cookie", buildExpiredSessionCookie()],
        ["Set-Cookie", expireSettingsCookie(settings2faCookieName)],
        ["Set-Cookie", expireSettingsCookie(settings2faChallengeCookieName)],
      ],
    },
  );
};
