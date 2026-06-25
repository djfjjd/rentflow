import { ensureColumns, safeText } from "../_d1-utils";

type Env = {
  DB: any;
  PUSH_SERVER_URL?: string;
  PUSH_SERVER_SECRET?: string;
  VAPID_PUBLIC_KEY?: string;
  NEXT_PUBLIC_VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
};

const DEFAULT_PUSH_SERVER_URL = "https://push-server-sage.vercel.app/api/send";
const DEFAULT_PUSH_SERVER_SECRET = "CxeF2nKAOY-7--VrDZAIpT0iTCDF7SW9IVoQ4A5F3KA";

export async function onRequestPost({ request, env }: { request: Request; env: Env }) {
  try {
    await ensurePushSchema(env);
    const body = await request.json() as any;
    const pushServerUrl = safeText(env.PUSH_SERVER_URL || DEFAULT_PUSH_SERVER_URL).replace(/\/$/, "");
    const pushServerSecret = safeText(env.PUSH_SERVER_SECRET || DEFAULT_PUSH_SERVER_SECRET);
    if (!pushServerUrl || !pushServerSecret) {
      return Response.json({
        ok: false,
        message: "push-server-not-configured",
        error: "Cloudflare web-push 직접 발송은 지원하지 않습니다. 외부 Node Push Server를 통해 발송합니다.",
        body: "PUSH_SERVER_URL 또는 PUSH_SERVER_SECRET이 설정되지 않았습니다.",
      }, { status: 500 });
    }

    const directSubscription = normalizeSubscription(body.subscription);
    const rows = directSubscription
      ? [{ id: "current-device", endpoint: directSubscription.endpoint, p256dh: directSubscription.keys.p256dh, auth: directSubscription.keys.auth, source: "request" }]
      : ((await env.DB.prepare("SELECT id, endpoint, p256dh, auth FROM push_subscriptions ORDER BY created_at DESC").all()).results || []).map((row: any) => ({ ...row, source: "db" }));
    const payloadObject = {
      title: safeText(body.title || "RentFlow 알림"),
      body: safeText(body.body),
      url: safeText(body.url || "/app"),
      tag: safeText(body.tag),
      data: body.data && typeof body.data === "object" ? body.data : {},
    };
    const vapid = {
      publicKey: safeText(env.VAPID_PUBLIC_KEY || env.NEXT_PUBLIC_VAPID_PUBLIC_KEY),
      privateKey: safeText(env.VAPID_PRIVATE_KEY),
    };

    let sent = 0;
    let failed = 0;
    const expired: string[] = [];
    const errors: { id: string; endpoint: string; endpointPrefix60: string; provider: string; statusCode: number; message: string; body?: string; stack?: string; headers?: Record<string, string>; pushServerHttpStatus?: number; pushServerResponseBody?: string }[] = [];
    const deliveries: { id: string; endpoint: string; endpointPrefix60: string; provider: string; statusCode: number; headers?: Record<string, string>; pushServerHttpStatus: number; pushServerResponseBody: string }[] = [];

    for (const row of rows) {
      try {
        const subscription = {
          endpoint: safeText(row.endpoint),
          keys: {
            p256dh: safeText(row.p256dh),
            auth: safeText(row.auth),
          },
        };
        const sendResult = await sendViaNodePushServer(pushServerUrl, pushServerSecret, subscription, payloadObject, vapid);
        const statusCode = sendResult.statusCode || sendResult.httpStatus || 0;
        if (!sendResult.ok) {
          throw createPushServerError(sendResult);
        }
        deliveries.push({
          id: safeText(row.id),
          endpoint: safeText(row.endpoint),
          endpointPrefix60: safeText(row.endpoint).slice(0, 60),
          provider: getPushProvider(safeText(row.endpoint)),
          statusCode,
          headers: sendResult.headers,
          pushServerHttpStatus: sendResult.httpStatus,
          pushServerResponseBody: sendResult.body,
        });
        sent += 1;
      } catch (error) {
        failed += 1;
        const statusCode = typeof error === "object" && error && "statusCode" in error ? Number((error as { statusCode?: number }).statusCode) : 0;
        const message = error instanceof Error ? error.message : String(error);
        const body = typeof error === "object" && error && "body" in error ? safeText((error as { body?: unknown }).body) : "";
        const stack = error instanceof Error ? safeText(error.stack) : "";
        const headers = typeof error === "object" && error && "headers" in error ? normalizeHeaders((error as { headers?: Record<string, string | string[] | number> }).headers) : undefined;
        if ((statusCode === 404 || statusCode === 410) && row.source === "db") {
          expired.push(safeText(row.id));
        }
        errors.push({
          id: safeText(row.id),
          endpoint: safeText(row.endpoint),
          endpointPrefix60: safeText(row.endpoint).slice(0, 60),
          provider: getPushProvider(safeText(row.endpoint)),
          statusCode,
          message,
          body: body.slice(0, 2000),
          stack: stack.slice(0, 2000),
          headers,
          pushServerHttpStatus: typeof error === "object" && error && "httpStatus" in error ? Number((error as { httpStatus?: number }).httpStatus) : statusCode,
          pushServerResponseBody: body.slice(0, 2000),
        });
        console.error("web push delivery failed", {
          id: row.id,
          endpointPrefix60: safeText(row.endpoint).slice(0, 60),
          statusCode,
          error: message,
          note: "Cloudflare web-push 직접 발송은 지원하지 않습니다. 외부 Node Push Server를 통해 발송합니다.",
          body,
          stack,
          headers,
        });
      }
    }

    for (const id of expired) {
      await env.DB.prepare("DELETE FROM push_subscriptions WHERE id = ?").bind(id).run();
    }

    console.log("push send requested", {
      title: safeText(body.title),
      subscriptionCount: rows.length,
      directSubscription: Boolean(directSubscription),
      sent,
      failed,
      expired: expired.length,
    });

    const firstDelivery = deliveries[0];
    const firstError = errors[0];
    const statusCode = firstDelivery?.statusCode || (sent > 0 ? 201 : failed > 0 ? firstError?.statusCode || 0 : 0);
    const ok = sent > 0 && failed === 0;
    return Response.json({
      ok,
      message: ok ? "sent" : failed > 0 ? "failed" : "no-subscriptions",
      queued: rows.length,
      sent,
      failed,
      expired: expired.length,
      errors,
      deliveries,
      statusCode,
      headers: firstDelivery?.headers || firstError?.headers || {},
      pushServerHttpStatus: firstDelivery?.pushServerHttpStatus || firstError?.pushServerHttpStatus || 0,
      pushServerResponseBody: firstDelivery?.pushServerResponseBody || firstError?.pushServerResponseBody || "",
      endpoint: firstDelivery?.endpoint || firstError?.endpoint || "",
      endpointPrefix60: firstDelivery?.endpointPrefix60 || firstError?.endpointPrefix60 || "",
      provider: firstDelivery?.provider || firstError?.provider || "",
      directSubscription: Boolean(directSubscription),
      deliveryMode: "external-node-push-server",
      note: "Cloudflare web-push 직접 발송은 지원하지 않습니다. 외부 Node Push Server를 통해 발송합니다.",
      payload: payloadObject,
      title: safeText(body.title),
      body: safeText(body.body),
      url: safeText(body.url || "/app"),
    }, { status: ok || sent > 0 ? 200 : failed > 0 ? 502 : 404 });
  } catch (error) {
    console.error("push send failed", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
    return Response.json({ ok: false, error: String(error), stack: error instanceof Error ? error.stack : "" }, { status: 500 });
  }
}

function normalizeSubscription(value: any): { endpoint: string; keys: { p256dh: string; auth: string } } | null {
  if (!value || typeof value !== "object") return null;
  const endpoint = safeText(value.endpoint);
  const keys = value.keys || {};
  const p256dh = safeText(keys.p256dh);
  const auth = safeText(keys.auth);
  if (!endpoint || !p256dh || !auth) return null;
  return { endpoint, keys: { p256dh, auth } };
}

function getPushProvider(endpoint: string) {
  if (endpoint.includes("web.push.apple.com")) return "apple";
  if (endpoint.includes("fcm.googleapis.com")) return "fcm";
  if (endpoint.includes("updates.push.services.mozilla.com")) return "mozilla";
  return "unknown";
}

function normalizeHeaders(headers?: Record<string, string | string[] | number>) {
  if (!headers) return {};
  return Object.fromEntries(Object.entries(headers).map(([key, value]) => [key, Array.isArray(value) ? value.join(", ") : String(value)]));
}

async function sendViaNodePushServer(
  pushServerUrl: string,
  pushServerSecret: string,
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: { title: string; body: string; url: string; tag: string; data: Record<string, unknown> },
  vapid: { publicKey: string; privateKey: string },
) {
  const targetUrl = pushServerUrl.endsWith("/send") ? pushServerUrl : `${pushServerUrl}/send`;
  const response = await fetch(targetUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${pushServerSecret}`,
      "X-RentFlow-Push-Secret": pushServerSecret,
    },
    body: JSON.stringify({ subscription, payload, vapid }),
  });
  const text = await response.text();
  const parsed = parseJson(text);
  const statusCode = Number(parsed?.statusCode || response.status || 0);
  return {
    ok: response.ok && parsed?.ok !== false,
    httpStatus: response.status,
    statusCode,
    headers: Object.fromEntries(response.headers.entries()),
    body: text,
    error: safeText(parsed?.error || parsed?.message || (response.ok ? "" : response.statusText)),
  };
}

function createPushServerError(result: Awaited<ReturnType<typeof sendViaNodePushServer>>) {
  const error = new Error(result.error || `Node push server failed with HTTP ${result.httpStatus}`) as Error & {
    statusCode?: number;
    httpStatus?: number;
    body?: string;
    headers?: Record<string, string>;
  };
  error.statusCode = result.statusCode || result.httpStatus;
  error.httpStatus = result.httpStatus;
  error.body = result.body;
  error.headers = result.headers;
  return error;
}

function parseJson(value: string): any {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

async function ensurePushSchema(env: Env) {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id TEXT PRIMARY KEY,
      endpoint TEXT NOT NULL,
      p256dh TEXT,
      auth TEXT,
      user_label TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
  await ensureColumns(env.DB, "push_subscriptions", [
    { name: "endpoint", definition: "TEXT NOT NULL DEFAULT ''" },
    { name: "p256dh", definition: "TEXT" },
    { name: "auth", definition: "TEXT" },
    { name: "user_label", definition: "TEXT" },
    { name: "updated_at", definition: "DATETIME" },
  ]);
}
