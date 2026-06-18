import { ensureColumns, noStoreHeaders } from "../_d1-utils";

type Env = {
  DB: any;
};

export async function onRequestGet({ env }: { env: Env }) {
  try {
    await ensureReservationSchema(env);
    const today = todayKorea();
    const { results } = await env.DB.prepare(
      `SELECT date, reservation_text, reserver_name
       FROM reservations
       WHERE date = ?
       ORDER BY COALESCE(updated_at, created_at, '') DESC`
    ).bind(today).all();

    return Response.json({
      today: today.replaceAll("-", "."),
      reservations: (results || []).map((row: any) => ({
        date: row.date,
        reservation_text: row.reservation_text || "",
        reserver_name: row.reserver_name || "",
      })),
    }, { headers: noStoreHeaders() });
  } catch (error) {
    console.error("widget today failed", { error: error instanceof Error ? error.message : String(error) });
    return Response.json({ error: String(error) }, { status: 500 });
  }
}

async function ensureReservationSchema(env: Env) {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS reservations (
      id TEXT PRIMARY KEY,
      date TEXT,
      reservation_text TEXT,
      reserver_name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
  await ensureColumns(env.DB, "reservations", [
    { name: "date", definition: "TEXT" },
    { name: "reservation_text", definition: "TEXT" },
    { name: "reserver_name", definition: "TEXT" },
    { name: "created_at", definition: "DATETIME" },
    { name: "updated_at", definition: "DATETIME" },
  ]);
}

function todayKorea() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
