import { reservations as seedReservations } from "../../lib/erp-data";
import { safeBindValues, safeNullableText, safeText } from "./_d1-utils";

type Env = {
  DB: any;
};

export async function onRequestGet({ env }: { env: Env }) {
  try {
    const { results } = await env.DB.prepare("SELECT * FROM reservations ORDER BY date DESC, time DESC").all();
    
    // Seed if empty
    if (results.length === 0 && seedReservations.length > 0) {
      const stmt = env.DB.prepare(
        "INSERT INTO reservations (id, date, time, end_time, vehicle_number, rent_car_number, customer_name, customer_car_number, factory_name, pickup_location, delivery_location, order_person, memo, route, repair_shop_partner_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      );
      
      const batch = seedReservations.map(r => 
        stmt.bind(...safeBindValues([r.id, r.date, r.time, r.endTime || null, r.vehicleNumber, r.rentCarNumber || null, r.customerName, r.customerCarNumber || null, r.factoryName || null, r.pickupLocation || null, r.deliveryLocation || null, r.orderPerson || null, r.memo || null, r.route, r.repairShopPartnerId || null, r.status]))
      );
      
      await env.DB.batch(batch);
      
      const { results: seededResults } = await env.DB.prepare("SELECT * FROM reservations ORDER BY date DESC, time DESC").all();
      return Response.json(seededResults.map(mapReservation));
    }

    return Response.json(results.map(mapReservation));
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 });
  }
}

export async function onRequestPost({ request, env }: { request: Request, env: Env }) {
  try {
    const r = await request.json() as any;
    await env.DB.prepare(
      "INSERT INTO reservations (id, date, time, end_time, vehicle_number, rent_car_number, customer_name, reservation_text, customer_car_number, customer_car_model, factory_name, pickup_location, delivery_location, order_person, memo, route, repair_shop_partner_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(
      safeText(r.id),
      safeText(r.date),
      safeText(r.time || "09:00"),
      safeNullableText(r.endTime),
      safeNullableText(r.vehicleNumber),
      safeNullableText(r.rentCarNumber),
      safeText(r.customerName || "예약"),
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

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 });
  }
}

export async function onRequestPatch({ request, env }: { request: Request, env: Env }) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) return Response.json({ error: "id is required" }, { status: 400 });
    const r = await request.json() as any;
    await env.DB.prepare(
      "UPDATE reservations SET date = ?, time = ?, customer_name = ?, reservation_text = ?, memo = ?, status = ? WHERE id = ?"
    ).bind(...safeBindValues([safeText(r.date), safeText(r.time || "09:00"), safeText(r.customerName || "예약"), safeNullableText(r.reservationText), safeNullableText(r.memo), safeText(r.status || "예약"), safeText(id)])).run();
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 });
  }
}

export async function onRequestDelete({ request, env }: { request: Request, env: Env }) {
  try {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return Response.json({ error: "id is required" }, { status: 400 });
    await env.DB.prepare("DELETE FROM reservations WHERE id = ?").bind(safeText(id)).run();
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 });
  }
}

export async function onRequestPut({ request, env }: { request: Request, env: Env }) {
  // Overwrite all reservations (for saveReservations)
  try {
    const reservations = await request.json() as any[];
    
    await env.DB.prepare("DELETE FROM reservations").run();
    
    if (reservations.length > 0) {
      const stmt = env.DB.prepare(
        "INSERT INTO reservations (id, date, time, end_time, vehicle_number, rent_car_number, customer_name, customer_car_number, factory_name, pickup_location, delivery_location, order_person, memo, route, repair_shop_partner_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      );
      
      const batch = reservations.map(r => 
        stmt.bind(...safeBindValues([r.id, r.date, r.time, r.endTime || null, r.vehicleNumber, r.rentCarNumber || null, r.customerName, r.customerCarNumber || null, r.factoryName || null, r.pickupLocation || null, r.deliveryLocation || null, r.orderPerson || null, r.memo || null, r.route, r.repairShopPartnerId || null, r.status]))
      );
      
      await env.DB.batch(batch);
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 });
  }
}

function mapReservation(row: any) {
  return {
    id: row.id,
    date: row.date,
    time: row.time,
    endTime: row.end_time,
    vehicleNumber: row.vehicle_number,
    rentCarNumber: row.rent_car_number,
    customerName: row.customer_name,
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
