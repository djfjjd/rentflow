import { buildSettingsCookie, createSettingsChallenge, deviceRegistrationChallengeCookieName, settingsChallengeMaxAgeSeconds } from "../../../../lib/settings-2fa";
import { normalizeEmail } from "../../../../lib/auth/jwt";
import { sendVerificationEmail } from "../../../../lib/email-verification";

type Env = {
  JWT_SECRET?: string;
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
};

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method !== "POST") return Response.json({ error: "Method not allowed." }, { status: 405 });
  const body = (await request.json().catch(() => ({}))) as { email?: string };
  const email = normalizeEmail(String(body.email || ""));
  if (!email) return Response.json({ error: "이메일이 필요합니다." }, { status: 400 });
  if (!env.JWT_SECRET) return Response.json({ error: "JWT_SECRET is not configured." }, { status: 500 });

  const { code, cookie } = await createSettingsChallenge(email, env.JWT_SECRET);
  try {
    await sendVerificationEmail({ apiKey: env.RESEND_API_KEY, from: env.EMAIL_FROM, to: email, code });
  } catch (error) {
    console.error("verification email send failed", { error: error instanceof Error ? error.message : String(error) });
    return Response.json({ error: "이메일 발송에 실패했습니다." }, { status: 502 });
  }
  const url = new URL(request.url);
  return Response.json(
    {
      ok: true,
      emailReady: true,
    },
    { headers: { "Set-Cookie": buildSettingsCookie(deviceRegistrationChallengeCookieName, cookie, url.protocol === "https:", settingsChallengeMaxAgeSeconds) } },
  );
};
