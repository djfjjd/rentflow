import { ensureColumns, noStoreHeaders } from "./_d1-utils";
import { requirePermissionLevel } from "./_permissions";

type Env = {
  DB: any;
  JWT_SECRET?: string;
};

type HistoryType = "all" | "dispatch" | "return";

export async function onRequestGet({ request, env }: { request: Request; env: Env }) {
  try {
    const auth = await requirePermissionLevel(request, env, "dispatch.manage", "read");
    if (auth.response) return auth.response;

    await ensureHistorySchemas(env);

    const url = new URL(request.url);
    const month = normalizeMonth(url.searchParams.get("month"));
    const type = normalizeType(url.searchParams.get("type"));
    const query = (url.searchParams.get("q") || "").trim();
    const search = query ? `%${query.toLowerCase()}%` : "";
    const parts: string[] = [];
    const binds: string[] = [];

    if (type === "all" || type === "dispatch") {
      parts.push(dispatchHistorySql(Boolean(query)));
      binds.push(month);
      if (query) binds.push(search);
    }
    if (type === "all" || type === "return") {
      parts.push(returnHistorySql(Boolean(query)));
      binds.push(month);
      if (query) binds.push(search);
    }

    const { results } = await env.DB.prepare(`
      SELECT *
      FROM (
        ${parts.join("\nUNION ALL\n")}
      )
      ORDER BY sort_date DESC, sort_time DESC, updated_at DESC, id DESC
    `).bind(...binds).all();

    return Response.json((results || []).map(mapHistoryRow), { headers: noStoreHeaders() });
  } catch (error) {
    console.error("dispatch return history failed", { error: error instanceof Error ? error.message : String(error) });
    return Response.json({ error: String(error) }, { status: 500, headers: noStoreHeaders() });
  }
}

function dispatchHistorySql(hasQuery: boolean) {
  return `
    SELECT
      id,
      'dispatch' AS type,
      COALESCE(dispatch_type, business_type, status, '배차') AS category,
      id AS contract_record_id,
      date AS record_date,
      time AS record_time,
      CASE
        WHEN COALESCE(return_at, '') != '' THEN return_at
        WHEN COALESCE(date, '') != '' THEN date || 'T' || COALESCE(NULLIF(substr(time, 1, 5), ''), '00:00') || ':00'
        ELSE COALESCE(updated_at, created_at, '')
      END AS completed_at,
      COALESCE(substr(NULLIF(return_at, ''), 1, 10), date, substr(COALESCE(updated_at, created_at, ''), 1, 10), '') AS sort_date,
      COALESCE(substr(NULLIF(return_at, ''), 12, 5), substr(time, 1, 5), substr(COALESCE(updated_at, created_at, ''), 12, 5), '') AS sort_time,
      COALESCE(vehicle_number, rental_car_number, plate_number, '') AS vehicle_number,
      COALESCE(customer_phone, phone, customer_contact, contact, '') AS customer_phone,
      COALESCE(orderer, ordered_by, customer_name, '') AS orderer,
      COALESCE(customer_car_model, '') AS customer_car_model,
      COALESCE(fuel_level_text, fuel_display, '') AS fuel,
      COALESCE(repair_shop, '') AS repair_shop,
      COALESCE(memo, notes, '') AS memo,
      TRIM(COALESCE(created_by_role, '') || ' ' || COALESCE(created_by_name, '')) AS created_by,
      COALESCE(updated_at, created_at, '') AS updated_at
    FROM dispatches
    WHERE retention_archived_at IS NULL
      AND (return_completed = 1 OR return_completed = true)
      AND COALESCE(return_at, '') != ''
      AND substr(COALESCE(NULLIF(return_at, ''), NULLIF(date, ''), substr(COALESCE(updated_at, created_at, ''), 1, 10)), 1, 7) = ?
      ${hasQuery ? `AND lower(
        COALESCE(vehicle_number, '') || ' ' ||
        COALESCE(rental_car_number, '') || ' ' ||
        COALESCE(customer_phone, '') || ' ' ||
        COALESCE(phone, '') || ' ' ||
        COALESCE(customer_contact, '') || ' ' ||
        COALESCE(contact, '') || ' ' ||
        COALESCE(orderer, '') || ' ' ||
        COALESCE(ordered_by, '') || ' ' ||
        COALESCE(customer_name, '') || ' ' ||
        COALESCE(customer_car_model, '') || ' ' ||
        COALESCE(repair_shop, '') || ' ' ||
        COALESCE(memo, '') || ' ' ||
        COALESCE(notes, '')
      ) LIKE ?` : ""}
  `;
}

function returnHistorySql(hasQuery: boolean) {
  return `
    SELECT
      id,
      'return' AS type,
      '회차' AS category,
      COALESCE(dispatch_id, '') AS contract_record_id,
      date AS record_date,
      time AS record_time,
      CASE
        WHEN COALESCE(date, '') != '' THEN date || 'T' || COALESCE(NULLIF(substr(time, 1, 5), ''), '00:00') || ':00'
        ELSE COALESCE(updated_at, created_at, '')
      END AS completed_at,
      COALESCE(date, substr(COALESCE(updated_at, created_at, ''), 1, 10), '') AS sort_date,
      COALESCE(substr(time, 1, 5), substr(COALESCE(updated_at, created_at, ''), 12, 5), '') AS sort_time,
      COALESCE(vehicle_number, rental_car_number, plate_number, '') AS vehicle_number,
      COALESCE(customer_phone_snapshot, '') AS customer_phone,
      COALESCE(orderer_snapshot, '') AS orderer,
      COALESCE(customer_car_model_snapshot, '') AS customer_car_model,
      COALESCE(fuel_level_text, fuel_display, dispatch_fuel_snapshot, '') AS fuel,
      COALESCE(repair_shop_snapshot, '') AS repair_shop,
      COALESCE(memo, notes, dispatch_memo_snapshot, '') AS memo,
      TRIM(COALESCE(created_by_role, '') || ' ' || COALESCE(created_by_name, '')) AS created_by,
      COALESCE(updated_at, created_at, '') AS updated_at
    FROM returns
    WHERE retention_archived_at IS NULL
      AND substr(COALESCE(NULLIF(date, ''), substr(COALESCE(updated_at, created_at, ''), 1, 10)), 1, 7) = ?
      ${hasQuery ? `AND lower(
        COALESCE(vehicle_number, '') || ' ' ||
        COALESCE(rental_car_number, '') || ' ' ||
        COALESCE(customer_phone_snapshot, '') || ' ' ||
        COALESCE(orderer_snapshot, '') || ' ' ||
        COALESCE(customer_car_model_snapshot, '') || ' ' ||
        COALESCE(repair_shop_snapshot, '') || ' ' ||
        COALESCE(memo, '') || ' ' ||
        COALESCE(notes, '') || ' ' ||
        COALESCE(dispatch_memo_snapshot, '')
      ) LIKE ?` : ""}
  `;
}

function mapHistoryRow(row: any) {
  return {
    id: row.id,
    type: row.type,
    category: normalizeCategory(row.category, row.type),
    contract_record_id: row.contract_record_id || "",
    completed_at: row.completed_at,
    date: row.record_date || "",
    time: row.record_time || "",
    vehicle_number: row.vehicle_number || "",
    customer_phone: row.customer_phone || "",
    orderer: row.orderer || "",
    customer_name: row.orderer || "",
    customer_car_model: row.customer_car_model || "",
    fuel: row.fuel || "",
    repair_shop: row.repair_shop || "",
    memo: row.memo || "",
    created_by: row.created_by || "-",
    updated_at: row.updated_at || "",
  };
}

function normalizeCategory(value: unknown, type: unknown) {
  if (type === "return") return "회차";
  const text = String(value || "").trim();
  if (text.includes("보험")) return "보험";
  if (text.includes("자차")) return "자차";
  if (text.includes("셀프")) return "셀프";
  return "보험";
}

function normalizeMonth(value: string | null) {
  if (value && /^\d{4}-\d{2}$/.test(value)) return value;
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit" }).format(new Date());
}

function normalizeType(value: string | null): HistoryType {
  if (value === "dispatch" || value === "return") return value;
  return "all";
}

async function ensureHistorySchemas(env: Env) {
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS dispatches (id TEXT PRIMARY KEY, date TEXT, time TEXT, vehicle_number TEXT, is_completed INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)").run();
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS returns (id TEXT PRIMARY KEY, date TEXT, time TEXT, vehicle_number TEXT, is_completed INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)").run();
  await ensureColumns(env.DB, "dispatches", [
    { name: "date", definition: "TEXT" },
    { name: "time", definition: "TEXT" },
    { name: "vehicle_number", definition: "TEXT" },
    { name: "rental_car_number", definition: "TEXT" },
    { name: "plate_number", definition: "TEXT" },
    { name: "customer_phone", definition: "TEXT" },
    { name: "phone", definition: "TEXT" },
    { name: "customer_contact", definition: "TEXT" },
    { name: "contact", definition: "TEXT" },
    { name: "orderer", definition: "TEXT" },
    { name: "ordered_by", definition: "TEXT" },
    { name: "customer_name", definition: "TEXT" },
    { name: "customer_car_model", definition: "TEXT" },
    { name: "dispatch_type", definition: "TEXT" },
    { name: "business_type", definition: "TEXT" },
    { name: "status", definition: "TEXT" },
    { name: "fuel_level_text", definition: "TEXT" },
    { name: "fuel_display", definition: "TEXT" },
    { name: "repair_shop", definition: "TEXT" },
    { name: "memo", definition: "TEXT" },
    { name: "notes", definition: "TEXT" },
    { name: "is_completed", definition: "INTEGER DEFAULT 0" },
    { name: "return_completed", definition: "INTEGER DEFAULT 0" },
    { name: "return_at", definition: "DATETIME" },
    { name: "created_by_role", definition: "TEXT" },
    { name: "created_by_name", definition: "TEXT" },
    { name: "created_at", definition: "DATETIME" },
    { name: "updated_at", definition: "DATETIME" },
    { name: "retention_archived_at", definition: "DATETIME" },
  ]);
  await ensureColumns(env.DB, "returns", [
    { name: "date", definition: "TEXT" },
    { name: "time", definition: "TEXT" },
    { name: "vehicle_number", definition: "TEXT" },
    { name: "rental_car_number", definition: "TEXT" },
    { name: "plate_number", definition: "TEXT" },
    { name: "customer_phone_snapshot", definition: "TEXT" },
    { name: "orderer_snapshot", definition: "TEXT" },
    { name: "customer_car_model_snapshot", definition: "TEXT" },
    { name: "fuel_level_text", definition: "TEXT" },
    { name: "fuel_display", definition: "TEXT" },
    { name: "dispatch_fuel_snapshot", definition: "TEXT" },
    { name: "repair_shop_snapshot", definition: "TEXT" },
    { name: "memo", definition: "TEXT" },
    { name: "notes", definition: "TEXT" },
    { name: "dispatch_memo_snapshot", definition: "TEXT" },
    { name: "dispatch_id", definition: "TEXT" },
    { name: "is_completed", definition: "INTEGER DEFAULT 0" },
    { name: "created_by_role", definition: "TEXT" },
    { name: "created_by_name", definition: "TEXT" },
    { name: "created_at", definition: "DATETIME" },
    { name: "updated_at", definition: "DATETIME" },
    { name: "retention_archived_at", definition: "DATETIME" },
  ]);
}
