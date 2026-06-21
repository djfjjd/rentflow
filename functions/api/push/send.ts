import webpush from "web-push";
import { ensureColumns, safeText } from "../_d1-utils";

type Env = {
  DB: any;
  VAPID_PUBLIC_KEY?: string;
  NEXT_PUBLIC_VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
  VAPID_SUBJECT?: string;
};

export async function onRequestPost({ request, env }: { request: Request; env: Env }) {
  try {
    await ensurePushSchema(env);
    const body = await request.json() as any;
    const publicKey = env.VAPID_PUBLIC_KEY || env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
    const privateKey = env.VAPID_PRIVATE_KEY || "";
    const subject = env.VAPID_SUBJECT || "mailto:admin@rentflow.local";
    if (!publicKey || !privateKey) {
      return Response.json({ error: "VAPID keys are not configured" }, { status: 500 });
    }

    webpush.setVapidDetails(subject, publicKey, privateKey);

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
    const payload = JSON.stringify(payloadObject);

    let sent = 0;
    let failed = 0;
    const expired: string[] = [];
    const errors: { id: string; endpoint: string; endpointPrefix60: string; provider: string; statusCode: number; message: string; body?: string; stack?: string; headers?: Record<string, string> }[] = [];
    const deliveries: { id: string; endpoint: string; endpointPrefix60: string; provider: string; statusCode: number; headers?: Record<string, string> }[] = [];

    for (const row of rows) {
      try {
        const sendResult = await webpush.sendNotification({
          endpoint: safeText(row.endpoint),
          keys: {
            p256dh: safeText(row.p256dh),
            auth: safeText(row.auth),
          },
        }, payload, { TTL: 60 * 60 });
        const result = sendResult as { statusCode?: number; headers?: Record<string, string | string[] | number> } | undefined;
        const statusCode = typeof result === "object" && result && "statusCode" in result ? Number(result.statusCode) : 201;
        deliveries.push({
          id: safeText(row.id),
          endpoint: safeText(row.endpoint),
          endpointPrefix60: safeText(row.endpoint).slice(0, 60),
          provider: getPushProvider(safeText(row.endpoint)),
          statusCode,
          headers: normalizeHeaders(result?.headers),
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
        });
        console.error("web push delivery failed", {
          id: row.id,
          endpointPrefix60: safeText(row.endpoint).slice(0, 60),
          statusCode,
          error: message,
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
      endpoint: firstDelivery?.endpoint || firstError?.endpoint || "",
      endpointPrefix60: firstDelivery?.endpointPrefix60 || firstError?.endpointPrefix60 || "",
      provider: firstDelivery?.provider || firstError?.provider || "",
      directSubscription: Boolean(directSubscription),
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
