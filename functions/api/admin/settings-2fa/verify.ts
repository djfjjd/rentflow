import { readCookie } from "../../../../lib/auth/jwt";
import { writeAuditLog } from "../../../../lib/audit-logs";
import {
  buildSettingsCookie,
  createSettings2faCookie,
  expireSettingsCookie,
  requireSettingsBaseSession,
  settings2faChallengeCookieName,
  settings2faCookieName,
  settings2faMaxAgeSeconds,
  verifySettingsChallenge,
} from "../../../../lib/settings-2fa";
import type { AdminApiEnv } from "../_auth";

export const onRequest: PagesFunction<AdminApiEnv> = async ({ request, env }) => {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed." }, { status: 405 });
  }

  const auth = await requireSettingsBaseSession(request, env);
  if (auth.response) return auth.response;

  const body = (await request.json().catch(() => ({}))) as { code?: string };
  const code = String(body.code || "").trim();
  const ok = /^\d{6}$/.test(code) && await verifySettingsChallenge(
    readCookie(request.headers.get("Cookie"), settings2faChallengeCookieName),
    code,
    auth.session.email,
    env.JWT_SECRET || "",
  );

  if (!ok) {
    await writeAuditLog(env.DB, { event: "settings_2fa_failed", actorEmail: auth.session.email });
    return Response.json({ error: "인증코드가 올바르지 않거나 만료되었습니다." }, { status: 401 });
  }

  const url = new URL(request.url);
  const verifiedCookie = await createSettings2faCookie(auth.session.email, env.JWT_SECRET || "");
  await writeAuditLog(env.DB, { event: "settings_2fa_success", actorEmail: auth.session.email });

  return Response.json(
    { ok: true },
    {
      headers: [
        ["Set-Cookie", buildSettingsCookie(settings2faCookieName, verifiedCookie, url.protocol === "https:", settings2faMaxAgeSeconds)],
        ["Set-Cookie", expireSettingsCookie(settings2faChallengeCookieName)],
      ],
    },
  );
};
