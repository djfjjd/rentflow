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

    const { results } = await env.DB.prepare("SELECT id, endpoint, p256dh, auth FROM push_subscriptions ORDER BY created_at DESC").all();
    const payload = JSON.stringify({
      title: safeText(body.title || "RentFlow 알림"),
      body: safeText(body.body),
      url: safeText(body.url || "/app"),
      tag: safeText(body.tag),
      data: body.data && typeof body.data === "object" ? body.data : {},
    });

    let sent = 0;
    let failed = 0;
    const expired: string[] = [];

    for (const row of results || []) {
      try {
        await webpush.sendNotification({
          endpoint: safeText(row.endpoint),
          keys: {
            p256dh: safeText(row.p256dh),
            auth: safeText(row.auth),
          },
        }, payload, { TTL: 60 * 60 });
        sent += 1;
      } catch (error) {
        failed += 1;
        const statusCode = typeof error === "object" && error && "statusCode" in error ? Number((error as { statusCode?: number }).statusCode) : 0;
        if (statusCode === 404 || statusCode === 410) {
          expired.push(safeText(row.id));
        }
        console.error("web push delivery failed", {
          id: row.id,
          statusCode,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    for (const id of expired) {
      await env.DB.prepare("DELETE FROM push_subscriptions WHERE id = ?").bind(id).run();
    }

    console.log("push send requested", {
      title: safeText(body.title),
      subscriptionCount: results?.length || 0,
      sent,
      failed,
      expired: expired.length,
    });

    return Response.json({
      ok: true,
      queued: results?.length || 0,
      sent,
      failed,
      expired: expired.length,
      title: safeText(body.title),
      body: safeText(body.body),
      url: safeText(body.url || "/app"),
    });
  } catch (error) {
    console.error("push send failed", { error: error instanceof Error ? error.message : String(error) });
    return Response.json({ error: String(error) }, { status: 500 });
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
