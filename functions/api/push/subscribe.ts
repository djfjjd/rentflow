import { ensureColumns, safeText } from "../_d1-utils";

type Env = {
  DB: any;
};

export async function onRequestPost({ request, env }: { request: Request; env: Env }) {
  try {
    await ensurePushSchema(env);
    const body = await request.json() as any;
    const subscription = body.subscription || body;
    const keys = subscription.keys || {};
    const id = crypto.randomUUID();

    await env.DB.prepare(
      `INSERT INTO push_subscriptions (id, endpoint, p256dh, auth, user_label)
       VALUES (?, ?, ?, ?, ?)`
    ).bind(
      id,
      safeText(subscription.endpoint),
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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
  await ensureColumns(env.DB, "push_subscriptions", [
    { name: "endpoint", definition: "TEXT NOT NULL DEFAULT ''" },
    { name: "p256dh", definition: "TEXT" },
    { name: "auth", definition: "TEXT" },
    { name: "user_label", definition: "TEXT" },
  ]);
}
