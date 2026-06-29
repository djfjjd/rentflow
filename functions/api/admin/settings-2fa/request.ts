import { writeAuditLog } from "../../../../lib/audit-logs";
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
  EMAIL_API_KEY?: string;
  EMAIL_FROM?: string;
};

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed." }, { status: 405 });
  }

  const auth = await requireSettingsBaseSession(request, env);
  if (auth.response) return auth.response;

  const { code, cookie } = await createSettingsChallenge(auth.session.email, env.JWT_SECRET || "");
  console.log("settings 2FA code", { email: auth.session.email, code });
  await writeAuditLog(env.DB, { event: "settings_2fa_requested", actorEmail: auth.session.email });

  const url = new URL(request.url);
  const hasEmailProvider = Boolean(env.EMAIL_API_KEY);
  return Response.json(
    {
      ok: true,
      sentTo: auth.session.email,
      devCode: isDevCodeVisible(request, hasEmailProvider) ? code : undefined,
      emailReady: hasEmailProvider,
    },
    { headers: { "Set-Cookie": buildSettingsCookie(settings2faChallengeCookieName, cookie, url.protocol === "https:", settingsChallengeMaxAgeSeconds) } },
  );
};
