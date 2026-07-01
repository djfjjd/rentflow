import { writeAuditLog } from "../../../../lib/audit-logs";
import { normalizeEmail } from "../../../../lib/auth/jwt";
import { sendVerificationEmail } from "../../../../lib/email-verification";
import {
  buildSettingsCookie,
  createSettingsChallenge,
  isDevCodeVisible,
  requireSettingsBaseSession,
  settings2faChallengeCookieName,
  settingsChallengeMaxAgeSeconds,
} from "../../../../lib/settings-2fa";
import type { AdminApiEnv } from "../_auth";

type Env = AdminApiEnv & {
  RESEND_API_KEY?: string;
  EMAIL_API_KEY?: string;
  EMAIL_FROM?: string;
};

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed." }, { status: 405 });
  }

  const auth = await requireSettingsBaseSession(request, env);
  if (auth.response) return auth.response;

  const email = normalizeEmail(auth.session.email);
  if (!email) {
    return Response.json({ error: "로그인한 계정의 이메일을 확인할 수 없습니다." }, { status: 400 });
  }

  const { code, cookie } = await createSettingsChallenge(email, env.JWT_SECRET || "");
  const apiKey = env.RESEND_API_KEY || env.EMAIL_API_KEY;
  const hasEmailProvider = Boolean(apiKey && env.EMAIL_FROM);
  if (hasEmailProvider) {
    try {
      await sendVerificationEmail({ apiKey, from: env.EMAIL_FROM, to: email, code });
    } catch (error) {
      console.error("settings 2FA email failed", { email, error: error instanceof Error ? error.message : String(error) });
      return Response.json({ error: "인증코드 이메일 발송에 실패했습니다." }, { status: 502 });
    }
  } else {
    console.log("settings 2FA code", { email, code });
  }
  await writeAuditLog(env.DB, { event: "settings_2fa_requested", actorEmail: email });

  const url = new URL(request.url);
  return Response.json(
    {
      ok: true,
      sentTo: email,
      devCode: isDevCodeVisible(request, hasEmailProvider) ? code : undefined,
      emailReady: hasEmailProvider,
    },
    { headers: { "Set-Cookie": buildSettingsCookie(settings2faChallengeCookieName, cookie, url.protocol === "https:", settingsChallengeMaxAgeSeconds) } },
  );
};
