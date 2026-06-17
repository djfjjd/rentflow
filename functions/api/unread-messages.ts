import { ensureColumns } from "./_d1-utils";

type Env = {
  DB: any;
};

export async function onRequestGet({ env }: { env: Env }) {
  try {
    await ensureUnreadSchemas(env);
    const [dispatches, returns] = await Promise.all([
      env.DB.prepare("SELECT * FROM dispatches WHERE COALESCE(is_completed, 0) = 0 ORDER BY date DESC, time DESC, created_at DESC").all(),
      env.DB.prepare("SELECT * FROM returns WHERE COALESCE(is_completed, 0) = 0 ORDER BY date DESC, time DESC, created_at DESC").all(),
    ]);
    return Response.json({
      dispatches: dispatches.results || [],
      returns: returns.results || [],
    });
  } catch (error) {
    console.error("unread messages list failed", { error: error instanceof Error ? error.message : String(error) });
    return Response.json({ error: String(error) }, { status: 500 });
  }
}

async function ensureUnreadSchemas(env: Env) {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS dispatches (
      id TEXT PRIMARY KEY,
      date TEXT,
      time TEXT,
      is_completed INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS returns (
      id TEXT PRIMARY KEY,
      date TEXT,
      time TEXT,
      is_completed INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
  await ensureColumns(env.DB, "dispatches", [
    { name: "is_completed", definition: "INTEGER DEFAULT 0" },
    { name: "date", definition: "TEXT" },
    { name: "time", definition: "TEXT" },
    { name: "created_at", definition: "DATETIME" },
  ]);
  await ensureColumns(env.DB, "returns", [
    { name: "is_completed", definition: "INTEGER DEFAULT 0" },
    { name: "date", definition: "TEXT" },
    { name: "time", definition: "TEXT" },
    { name: "created_at", definition: "DATETIME" },
  ]);
}
