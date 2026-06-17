import { returns as seedReturns } from "../../lib/erp-data";
import { ensureColumns, safeBindValues, safeBoolInt, safeNullableText, safeNumber, safeText } from "./_d1-utils";

type Env = {
  DB: any;
};

export async function onRequestGet({ env }: { env: Env }) {
  try {
    await ensureReturnSchema(env);
    const { results } = await env.DB.prepare("SELECT * FROM returns ORDER BY created_at DESC").all();
    
    // Seed if empty
    if (results.length === 0 && seedReturns.length > 0) {
      const stmt = env.DB.prepare(
        "INSERT INTO returns (id, rental_car_number, return_address, arrival_address, fuel_level, mileage, notes, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      );
      
      const batch = seedReturns.map(r => 
        stmt.bind(...safeBindValues([r.id, r.rentalCarNumber, r.returnAddress, r.arrivalAddress, r.fuelLevel, r.mileage, r.notes, r.status]))
      );
      
      await env.DB.batch(batch);
      
      const { results: seededResults } = await env.DB.prepare("SELECT * FROM returns ORDER BY created_at DESC").all();
      return Response.json(seededResults.map(mapReturn));
    }

    return Response.json(results.map(mapReturn));
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
    await env.DB.prepare(
      "INSERT INTO returns (id, date, time, rental_car_number, return_address, arrival_address, fuel_level, fuel_display, fuel_level_text, vehicle_color, mileage, notes, memo, status, is_completed) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(
      safeText(r.id),
      safeNullableText(r.date),
      safeNullableText(r.time),
      safeText(r.rentalCarNumber),
      safeText(r.returnAddress),
      safeText(r.arrivalAddress),
      safeNumber(r.fuelLevel),
      safeText(fuelLevelText),
      safeText(fuelLevelText),
      safeText(r.vehicleColor),
      safeNumber(r.mileage) || 0,
      safeText(memo),
      safeText(memo),
      safeText(r.status || "회차등록"),
      safeBoolInt(r.isCompleted)
    ).run();

    return Response.json({ success: true });
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
    if (updates.rentalCarNumber !== undefined) { fields.push("rental_car_number = ?"); values.push(safeText(updates.rentalCarNumber)); }
    if (updates.date !== undefined) { fields.push("date = ?"); values.push(safeNullableText(updates.date)); }
    if (updates.time !== undefined) { fields.push("time = ?"); values.push(safeNullableText(updates.time)); }
    if (updates.returnAddress !== undefined) { fields.push("return_address = ?"); values.push(safeText(updates.returnAddress)); }
    if (updates.arrivalAddress !== undefined) { fields.push("arrival_address = ?"); values.push(safeText(updates.arrivalAddress)); }
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
    if (updates.isCompleted !== undefined) { fields.push("is_completed = ?"); values.push(safeBoolInt(updates.isCompleted)); }
    if (fields.length === 0) return Response.json({ success: true });
    values.push(id);
    await env.DB.prepare(`UPDATE returns SET ${fields.join(", ")} WHERE id = ?`).bind(...safeBindValues(values)).run();
    return Response.json({ success: true });
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
    return Response.json({ success: true });
  } catch (error) {
    console.error("return delete failed", { error: error instanceof Error ? error.message : String(error) });
    return Response.json({ error: String(error) }, { status: 500 });
  }
}

function mapReturn(row: any) {
  return {
    id: row.id,
    date: row.date,
    time: row.time,
    rentalCarNumber: row.rental_car_number,
    returnAddress: row.return_address,
    arrivalAddress: row.arrival_address,
    fuelLevel: row.fuel_level,
    fuelDisplay: row.fuel_level_text || row.fuel_display,
    fuelLevelText: row.fuel_level_text || row.fuel_display,
    vehicleColor: row.vehicle_color,
    mileage: row.mileage,
    notes: row.memo || row.notes,
    memo: row.memo || row.notes,
    status: row.status,
    isCompleted: Boolean(row.is_completed),
    createdAt: row.created_at
  };
}

async function ensureReturnSchema(env: Env) {
  await ensureColumns(env.DB, "returns", [
    { name: "date", definition: "TEXT" },
    { name: "time", definition: "TEXT" },
    { name: "is_completed", definition: "INTEGER DEFAULT 0" },
    { name: "fuel_level_text", definition: "TEXT" },
    { name: "vehicle_color", definition: "TEXT" },
    { name: "memo", definition: "TEXT" },
  ]);
}
