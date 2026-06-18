import { ensureColumns, noStoreHeaders, safeBindValues, safeBoolInt, safeNullableText, safeNumber, safeText } from "./_d1-utils";

type Env = {
  DB: any;
};

export async function onRequestGet({ env }: { env: Env }) {
  try {
    await ensureReturnSchema(env);
    const { results } = await env.DB.prepare(`
      SELECT *
      FROM returns
      ORDER BY
        COALESCE(date, '') DESC,
        COALESCE(time, '') DESC,
        COALESCE(updated_at, created_at, '') DESC
    `).all();
    console.log("return rows from D1", results.length, results[0]);

    return Response.json(results.map(mapReturn), { headers: noStoreHeaders() });
  } catch (error) {
    console.error("return list failed", { error: error instanceof Error ? error.message : String(error) });
    return Response.json({ error: String(error) }, { status: 500 });
  }
}

export async function onRequestPost({ request, env }: { request: Request, env: Env }) {
  try {
    await ensureReturnSchema(env);
    const r = await request.json() as any;
    const fuelLevelText = r.fuelLevelText ?? r.fuelDisplay;
    const memo = r.memo ?? r.notes;
    const vehicleNumber = r.vehicleNumber ?? r.rentalCarNumber;
    const parkingZone = r.parkingZone ?? r.arrivalAddress;
    await env.DB.prepare(
      "INSERT INTO returns (id, date, time, vehicle_number, rental_car_number, return_address, arrival_address, mileage, fuel_level, fuel_display, fuel_level_text, vehicle_color, parking_zone, notes, memo, status, is_completed, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)"
    ).bind(
      safeText(r.id),
      safeNullableText(r.date),
      safeNullableText(r.time),
      safeText(vehicleNumber),
      safeText(vehicleNumber),
      safeText(r.returnAddress),
      safeText(parkingZone),
      safeNumber(r.mileage) || 0,
      safeNumber(r.fuelLevel),
      safeText(fuelLevelText),
      safeText(fuelLevelText),
      safeText(r.vehicleColor),
      safeText(parkingZone),
      safeText(memo),
      safeText(memo),
      safeText(r.status || "회차등록"),
      safeBoolInt(r.isCompleted)
    ).run();

    console.log("return saved", r.id);
    return Response.json({ ok: true, success: true, id: safeText(r.id) }, { headers: noStoreHeaders() });
  } catch (error) {
    console.error("return save failed", { error: error instanceof Error ? error.message : String(error) });
    return Response.json({ error: String(error) }, { status: 500 });
  }
}

export async function onRequestPatch({ request, env }: { request: Request, env: Env }) {
  try {
    await ensureReturnSchema(env);
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return Response.json({ error: "id is required" }, { status: 400 });
    const updates = await request.json() as any;
    const fields = [];
    const values = [];
    const vehicleNumber = updates.vehicleNumber ?? updates.rentalCarNumber;
    const parkingZone = updates.parkingZone ?? updates.arrivalAddress;
    if (updates.rentalCarNumber !== undefined || updates.vehicleNumber !== undefined) {
      fields.push("vehicle_number = ?", "rental_car_number = ?");
      values.push(safeText(vehicleNumber), safeText(vehicleNumber));
    }
    if (updates.date !== undefined) { fields.push("date = ?"); values.push(safeNullableText(updates.date)); }
    if (updates.time !== undefined) { fields.push("time = ?"); values.push(safeNullableText(updates.time)); }
    if (updates.returnAddress !== undefined) { fields.push("return_address = ?"); values.push(safeText(updates.returnAddress)); }
    if (updates.arrivalAddress !== undefined || updates.parkingZone !== undefined) {
      fields.push("arrival_address = ?", "parking_zone = ?");
      values.push(safeText(parkingZone), safeText(parkingZone));
    }
    if (updates.fuelDisplay !== undefined || updates.fuelLevelText !== undefined) {
      const fuelLevelText = updates.fuelLevelText ?? updates.fuelDisplay;
      fields.push("fuel_display = ?", "fuel_level_text = ?");
      values.push(safeText(fuelLevelText), safeText(fuelLevelText));
    }
    if (updates.vehicleColor !== undefined) { fields.push("vehicle_color = ?"); values.push(safeText(updates.vehicleColor)); }
    if (updates.mileage !== undefined) { fields.push("mileage = ?"); values.push(safeNumber(updates.mileage)); }
    if (updates.notes !== undefined || updates.memo !== undefined) {
      const memo = updates.memo ?? updates.notes;
      fields.push("notes = ?", "memo = ?");
      values.push(safeText(memo), safeText(memo));
    }
    if (updates.status !== undefined) { fields.push("status = ?"); values.push(safeText(updates.status)); }
    if (updates.isCompleted !== undefined || updates.is_completed !== undefined) {
      fields.push("is_completed = ?");
      values.push(safeBoolInt(updates.isCompleted ?? updates.is_completed));
    }
    if (fields.length === 0) return Response.json({ success: true });
    fields.push("updated_at = CURRENT_TIMESTAMP");
    values.push(id);
    await env.DB.prepare(`UPDATE returns SET ${fields.join(", ")} WHERE id = ?`).bind(...safeBindValues(values)).run();
    if (parkingZone !== undefined && vehicleNumber !== undefined) {
      await env.DB.prepare(
        "UPDATE vehicles SET location = ?, status = ?, active_summary = ?, updated_at = CURRENT_TIMESTAMP WHERE plate_number = ?"
      ).bind(safeText(parkingZone), "주차구역표시", safeText(parkingZone), safeText(vehicleNumber)).run();
    }
    return Response.json({ ok: true, success: true, id: safeText(id) }, { headers: noStoreHeaders() });
  } catch (error) {
    console.error("return update failed", { error: error instanceof Error ? error.message : String(error) });
    return Response.json({ error: String(error) }, { status: 500 });
  }
}

export async function onRequestDelete({ request, env }: { request: Request, env: Env }) {
  try {
    await ensureReturnSchema(env);
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return Response.json({ error: "id is required" }, { status: 400 });
    await env.DB.prepare("DELETE FROM returns WHERE id = ?").bind(safeText(id)).run();
    return Response.json({ success: true }, { headers: noStoreHeaders() });
  } catch (error) {
    console.error("return delete failed", { error: error instanceof Error ? error.message : String(error) });
    return Response.json({ error: String(error) }, { status: 500 });
  }
}

function mapReturn(row: any) {
  const vehicleNumber = row.vehicle_number || row.rental_car_number || row.plate_number || "";
  const parkingZone = row.parking_zone || row.arrival_address || row.return_address || row.location || "";
  const fuelLevelText = row.fuel_level_text || row.fuel_display || "";
  const memo = row.memo || row.notes || "";
  return {
    id: row.id,
    date: row.date,
    time: row.time,
    vehicle_number: vehicleNumber,
    mileage: row.mileage,
    fuel_level_text: fuelLevelText,
    parking_zone: parkingZone,
    memo,
    is_completed: row.is_completed ?? 0,
    created_at: row.created_at,
    updated_at: row.updated_at,
    vehicleNumber,
    rentalCarNumber: vehicleNumber,
    returnAddress: row.return_address,
    arrivalAddress: parkingZone,
    parkingZone,
    fuelLevel: row.fuel_level,
    fuelDisplay: fuelLevelText,
    fuelLevelText,
    vehicleColor: row.vehicle_color,
    notes: memo,
    status: row.status,
    isCompleted: Boolean(row.is_completed),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function ensureReturnSchema(env: Env) {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS vehicles (
      id TEXT PRIMARY KEY,
      plate_number TEXT,
      location TEXT,
      status TEXT,
      active_summary TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
  await ensureColumns(env.DB, "vehicles", [
    { name: "plate_number", definition: "TEXT" },
    { name: "location", definition: "TEXT" },
    { name: "status", definition: "TEXT" },
    { name: "active_summary", definition: "TEXT" },
    { name: "updated_at", definition: "DATETIME" },
  ]);
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS returns (
      id TEXT PRIMARY KEY,
      date TEXT,
      time TEXT,
      vehicle_number TEXT,
      return_address TEXT,
      mileage INTEGER,
      fuel_level_text TEXT,
      parking_zone TEXT,
      memo TEXT,
      is_completed INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
  await ensureColumns(env.DB, "returns", [
    { name: "date", definition: "TEXT" },
    { name: "time", definition: "TEXT" },
    { name: "vehicle_number", definition: "TEXT" },
    { name: "rental_car_number", definition: "TEXT" },
    { name: "return_address", definition: "TEXT" },
    { name: "arrival_address", definition: "TEXT" },
    { name: "mileage", definition: "INTEGER" },
    { name: "is_completed", definition: "INTEGER DEFAULT 0" },
    { name: "parking_zone", definition: "TEXT" },
    { name: "fuel_level", definition: "REAL" },
    { name: "fuel_display", definition: "TEXT" },
    { name: "fuel_level_text", definition: "TEXT" },
    { name: "vehicle_color", definition: "TEXT" },
    { name: "notes", definition: "TEXT" },
    { name: "status", definition: "TEXT" },
    { name: "memo", definition: "TEXT" },
    { name: "created_at", definition: "DATETIME" },
    { name: "updated_at", definition: "DATETIME" },
  ]);
}
