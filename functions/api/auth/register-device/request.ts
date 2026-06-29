import { buildSettingsCookie, createSettingsChallenge, deviceRegistrationChallengeCookieName, isDevCodeVisible, settingsChallengeMaxAgeSeconds } from "../../../../lib/settings-2fa";
import { normalizeEmail } from "../../../../lib/auth/jwt";

type Env = {
  JWT_SECRET?: string;
  EMAIL_API_KEY?: string;
  NODE_ENV?: string;
  SHOW_DEV_VERIFICATION_CODE?: string;
};

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method !== "POST") return Response.json({ error: "Method not allowed." }, { status: 405 });
  const body = (await request.json().catch(() => ({}))) as { email?: string };
  const email = normalizeEmail(String(body.email || ""));
  if (!email) return Response.json({ error: "이메일이 필요합니다." }, { status: 400 });
  if (!env.JWT_SECRET) return Response.json({ error: "JWT_SECRET is not configured." }, { status: 500 });

  const { code, cookie } = await createSettingsChallenge(email, env.JWT_SECRET);
  console.log("device registration code", { email, code });
  const url = new URL(request.url);
  const hasEmailProvider = Boolean(env.EMAIL_API_KEY);
  const showDevCode = String(env.SHOW_DEV_VERIFICATION_CODE || "").toLowerCase() === "true" || String(env.NODE_ENV || "production") !== "production" || isDevCodeVisible(request, hasEmailProvider);
  return Response.json(
    {
      ok: true,
      devCode: showDevCode ? code : undefined,
      emailReady: hasEmailProvider,
    },
    { headers: { "Set-Cookie": buildSettingsCookie(deviceRegistrationChallengeCookieName, cookie, url.protocol === "https:", settingsChallengeMaxAgeSeconds) } },
  );
};
