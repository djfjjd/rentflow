import { ensureColumns, safeText } from "../_d1-utils";

type Env = {
  DB: any;
  VAPID_PUBLIC_KEY?: string;
  NEXT_PUBLIC_VAPID_PUBLIC_KEY?: string;
};

export async function onRequestGet({ env }: { env: Env }) {
  return Response.json({
    publicKey: env.VAPID_PUBLIC_KEY || env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "",
  });
}

export async function onRequestPost({ request, env }: { request: Request; env: Env }) {
  try {
    await ensurePushSchema(env);
    const body = await request.json() as any;
    const subscription = body.subscription || body;
    const keys = subscription.keys || {};
    const id = crypto.randomUUID();
    const endpoint = safeText(subscription.endpoint);

    if (!endpoint || !keys.p256dh || !keys.auth) {
      return Response.json({ error: "invalid push subscription" }, { status: 400 });
    }

    await env.DB.prepare("DELETE FROM push_subscriptions WHERE endpoint = ?").bind(endpoint).run();
    await env.DB.prepare(
      `INSERT INTO push_subscriptions (id, endpoint, p256dh, auth, user_label, updated_at)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
    ).bind(
      id,
      endpoint,
      safeText(keys.p256dh),
      safeText(keys.auth),
      safeText(body.userLabel || body.user_label || "field")
    ).run();

    return Response.json({ ok: true, id });
  } catch (error) {
    console.error("push subscribe failed", { error: error instanceof Error ? error.message : String(error) });
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
