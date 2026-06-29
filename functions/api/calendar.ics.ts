import { ensureColumns, noStoreHeaders } from "./_d1-utils";
import { addDays, parseReservationDateRange } from "../../lib/reservation-date-range";

type Env = {
  DB: any;
};

export async function onRequestGet({ env }: { env: Env }) {
  try {
    await ensureReservationSchema(env);
    const { results } = await env.DB.prepare(
      `SELECT id, date, start_date, end_date, duration_days, reservation_text, reserver_name, created_at, updated_at
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
        const range = row.start_date && row.end_date
          ? { startDate: row.start_date, endDate: row.end_date, durationDays: Number(row.duration_days || 1) }
          : parseReservationDateRange(row.date, row.reservation_text || "");
        const start = toIcsDate(range.startDate);
        const end = toIcsDate(addDays(range.endDate, 1));
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
      start_date TEXT,
      end_date TEXT,
      duration_days INTEGER DEFAULT 1,
      reservation_text TEXT,
      reserver_name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
  await ensureColumns(env.DB, "reservations", [
    { name: "date", definition: "TEXT" },
    { name: "start_date", definition: "TEXT" },
    { name: "end_date", definition: "TEXT" },
    { name: "duration_days", definition: "INTEGER DEFAULT 1" },
    { name: "reservation_text", definition: "TEXT" },
    { name: "reserver_name", definition: "TEXT" },
    { name: "created_at", definition: "DATETIME" },
    { name: "updated_at", definition: "DATETIME" },
  ]);
}

function toIcsDate(date: string) {
  return date.replaceAll("-", "").slice(0, 8);
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
