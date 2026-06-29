import { ensureColumns, noStoreHeaders, safeBindValues, safeNullableText, safeText } from "./_d1-utils";
import { resolveReservationDateRange } from "../../lib/reservation-date-range";

type Env = {
  DB: any;
};

export async function onRequestGet({ env }: { env: Env }) {
  try {
    await ensureReservationSchema(env);
    const { results } = await env.DB.prepare("SELECT * FROM reservations ORDER BY date DESC, time DESC").all();

    return Response.json(results.map(mapReservation), { headers: noStoreHeaders() });
  } catch (error) {
    console.error("reservation list failed", { error: error instanceof Error ? error.message : String(error) });
    return Response.json({ error: String(error) }, { status: 500 });
  }
}

export async function onRequestPost({ request, env }: { request: Request, env: Env }) {
  try {
    await ensureReservationSchema(env);
    const r = await request.json() as any;
    const reserverName = r.reserverName ?? r.customerName;
    const range = resolveReservationDateRange({ startDate: safeText(r.startDate || r.date), endDate: safeText(r.endDate), reservationText: safeText(r.reservationText || r.memo) });
    await env.DB.prepare(
      "INSERT INTO reservations (id, date, start_date, end_date, duration_days, time, end_time, vehicle_number, rent_car_number, customer_name, reserver_name, reservation_text, customer_car_number, customer_car_model, factory_name, pickup_location, delivery_location, order_person, memo, route, repair_shop_partner_id, status, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)"
    ).bind(
      safeText(r.id),
      range.startDate,
      range.startDate,
      range.endDate,
      range.durationDays,
      safeText(r.time || "09:00"),
      safeNullableText(r.endTime),
      safeNullableText(r.vehicleNumber),
      safeNullableText(r.rentCarNumber),
      safeText(reserverName || "예약"),
      safeText(reserverName || "예약"),
      safeNullableText(r.reservationText),
      safeNullableText(r.customerCarNumber),
      safeNullableText(r.customerCarModel),
      safeNullableText(r.factoryName),
      safeNullableText(r.pickupLocation),
      safeNullableText(r.deliveryLocation),
      safeNullableText(r.orderPerson),
      safeNullableText(r.memo),
      safeText(r.route || "예약"),
      safeNullableText(r.repairShopPartnerId),
      safeText(r.status || "예약")
    ).run();

    console.log("saved reservation id", r.id);
    return Response.json({ ok: true, success: true, id: safeText(r.id) }, { headers: noStoreHeaders() });
  } catch (error) {
    console.error("reservation save failed", { error: error instanceof Error ? error.message : String(error) });
    return Response.json({ error: String(error) }, { status: 500 });
  }
}

export async function onRequestPatch({ request, env }: { request: Request, env: Env }) {
  try {
    await ensureReservationSchema(env);
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) return Response.json({ error: "id is required" }, { status: 400 });
    const r = await request.json() as any;
    const reserverName = r.reserverName ?? r.customerName;
    const range = resolveReservationDateRange({ startDate: safeText(r.startDate || r.date), endDate: safeText(r.endDate), reservationText: safeText(r.reservationText || r.memo) });
    await env.DB.prepare(
      "UPDATE reservations SET date = ?, start_date = ?, end_date = ?, duration_days = ?, time = ?, customer_name = ?, reserver_name = ?, reservation_text = ?, memo = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).bind(...safeBindValues([range.startDate, range.startDate, range.endDate, range.durationDays, safeText(r.time || "09:00"), safeText(reserverName || "예약"), safeText(reserverName || "예약"), safeNullableText(r.reservationText), safeNullableText(r.memo), safeText(r.status || "예약"), safeText(id)])).run();
    return Response.json({ ok: true, success: true, id: safeText(id) }, { headers: noStoreHeaders() });
  } catch (error) {
    console.error("reservation update failed", { error: error instanceof Error ? error.message : String(error) });
    return Response.json({ error: String(error) }, { status: 500 });
  }
}

export async function onRequestDelete({ request, env }: { request: Request, env: Env }) {
  try {
    await ensureReservationSchema(env);
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return Response.json({ error: "id is required" }, { status: 400 });
    await env.DB.prepare("DELETE FROM reservations WHERE id = ?").bind(safeText(id)).run();
    return Response.json({ success: true }, { headers: noStoreHeaders() });
  } catch (error) {
    console.error("reservation delete failed", { error: error instanceof Error ? error.message : String(error) });
    return Response.json({ error: String(error) }, { status: 500 });
  }
}

export async function onRequestPut({ request, env }: { request: Request, env: Env }) {
  // Overwrite all reservations (for saveReservations)
  try {
    await ensureReservationSchema(env);
    const reservations = await request.json() as any[];
    
    await env.DB.prepare("DELETE FROM reservations").run();
    
    if (reservations.length > 0) {
      const stmt = env.DB.prepare(
        "INSERT INTO reservations (id, date, start_date, end_date, duration_days, time, end_time, vehicle_number, rent_car_number, customer_name, customer_car_number, factory_name, pickup_location, delivery_location, order_person, memo, route, repair_shop_partner_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      );
      
      const batch = reservations.map(r => {
        const range = resolveReservationDateRange({ startDate: safeText(r.startDate || r.date), endDate: safeText(r.endDate), reservationText: safeText(r.reservationText || r.memo) });
        return stmt.bind(...safeBindValues([r.id, range.startDate, range.startDate, range.endDate, range.durationDays, r.time, r.endTime || null, r.vehicleNumber, r.rentCarNumber || null, r.customerName, r.customerCarNumber || null, r.factoryName || null, r.pickupLocation || null, r.deliveryLocation || null, r.orderPerson || null, r.memo || null, r.route, r.repairShopPartnerId || null, r.status]));
      });
      
      await env.DB.batch(batch);
    }

    return Response.json({ success: true }, { headers: noStoreHeaders() });
  } catch (error) {
    console.error("reservation replace failed", { error: error instanceof Error ? error.message : String(error) });
    return Response.json({ error: String(error) }, { status: 500 });
  }
}

function mapReservation(row: any) {
  return {
    id: row.id,
    date: row.date,
    startDate: row.start_date || row.date,
    endDate: row.end_date || row.date,
    durationDays: row.duration_days || 1,
    time: row.time,
    endTime: row.end_time,
    vehicleNumber: row.vehicle_number,
    rentCarNumber: row.rent_car_number,
    customerName: row.reserver_name || row.customer_name,
    reserverName: row.reserver_name || row.customer_name,
    reservationText: row.reservation_text,
    customerCarNumber: row.customer_car_number,
    customerCarModel: row.customer_car_model,
    factoryName: row.factory_name,
    pickupLocation: row.pickup_location,
    deliveryLocation: row.delivery_location,
    orderPerson: row.order_person,
    memo: row.memo,
    route: row.route,
    repairShopPartnerId: row.repair_shop_partner_id,
    status: row.status,
    createdAt: row.created_at
  };
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
    { name: "time", definition: "TEXT" },
    { name: "end_time", definition: "TEXT" },
    { name: "vehicle_number", definition: "TEXT" },
    { name: "rent_car_number", definition: "TEXT" },
    { name: "customer_name", definition: "TEXT" },
    { name: "reserver_name", definition: "TEXT" },
    { name: "reservation_text", definition: "TEXT" },
    { name: "customer_car_number", definition: "TEXT" },
    { name: "customer_car_model", definition: "TEXT" },
    { name: "factory_name", definition: "TEXT" },
    { name: "pickup_location", definition: "TEXT" },
    { name: "delivery_location", definition: "TEXT" },
    { name: "order_person", definition: "TEXT" },
    { name: "memo", definition: "TEXT" },
    { name: "route", definition: "TEXT" },
    { name: "repair_shop_partner_id", definition: "TEXT" },
    { name: "status", definition: "TEXT" },
    { name: "updated_at", definition: "DATETIME" },
  ]);
}
