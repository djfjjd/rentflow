import { ensureColumns, noStoreHeaders } from "./_d1-utils";

type Env = {
  DB: any;
};

export async function onRequestGet({ env }: { env: Env }) {
  try {
    await ensureReservationSchema(env);
    const { results } = await env.DB.prepare(
      `SELECT id, date, reservation_text, reserver_name, created_at, updated_at
       FROM reservations
       WHERE date IS NOT NULL AND date != ''
       ORDER BY date ASC, COALESCE(updated_at, created_at, '') ASC`
    ).all();

    const now = toIcsDateTime(new Date());
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//RentFlow//Reservation Calendar//KO",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "X-WR-CALNAME:RentFlow 예약일정",
      "X-WR-TIMEZONE:Asia/Seoul",
      ...(results || []).flatMap((row: any) => {
        const summary = escapeIcs(row.reservation_text || row.reserver_name || "예약내용 없음");
        const start = toIcsDate(row.date);
        const end = addOneDayIcs(row.date);
        return [
          "BEGIN:VEVENT",
          `UID:${escapeIcs(row.id || `${row.date}-${summary}`)}@rentflow`,
          `DTSTAMP:${now}`,
          `DTSTART;VALUE=DATE:${start}`,
          `DTEND;VALUE=DATE:${end}`,
          `SUMMARY:${summary}`,
          `DESCRIPTION:${summary}`,
          "END:VEVENT",
        ];
      }),
      "END:VCALENDAR",
    ];

    return new Response(lines.join("\r\n"), {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        ...noStoreHeaders(),
      },
    });
  } catch (error) {
    console.error("calendar ics failed", { error: error instanceof Error ? error.message : String(error) });
    return new Response(String(error), { status: 500 });
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

function toIcsDate(date: string) {
  return date.replaceAll("-", "").slice(0, 8);
}

function addOneDayIcs(date: string) {
  const parsed = new Date(`${date}T00:00:00+09:00`);
  parsed.setUTCDate(parsed.getUTCDate() + 1);
  return parsed.toISOString().slice(0, 10).replaceAll("-", "");
}

function toIcsDateTime(date: Date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function escapeIcs(value: string) {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll("\n", "\\n")
    .replaceAll(",", "\\,")
    .replaceAll(";", "\\;");
}
