import { returns as seedReturns } from "../../lib/erp-data";

type Env = {
  DB: any;
};

export async function onRequestGet({ env }: { env: Env }) {
  try {
    const { results } = await env.DB.prepare("SELECT * FROM returns ORDER BY created_at DESC").all();
    
    // Seed if empty
    if (results.length === 0 && seedReturns.length > 0) {
      const stmt = env.DB.prepare(
        "INSERT INTO returns (id, rental_car_number, return_address, arrival_address, fuel_level, mileage, notes, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      );
      
      const batch = seedReturns.map(r => 
        stmt.bind(r.id, r.rentalCarNumber, r.returnAddress, r.arrivalAddress, r.fuelLevel, r.mileage, r.notes, r.status)
      );
      
      await env.DB.batch(batch);
      
      const { results: seededResults } = await env.DB.prepare("SELECT * FROM returns ORDER BY created_at DESC").all();
      return Response.json(seededResults.map(mapReturn));
    }

    return Response.json(results.map(mapReturn));
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 });
  }
}

export async function onRequestPost({ request, env }: { request: Request, env: Env }) {
  try {
    const r = await request.json() as any;
    await env.DB.prepare(
      "INSERT INTO returns (id, rental_car_number, return_address, arrival_address, fuel_level, fuel_display, mileage, notes, status, is_completed) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(
      r.id, r.rentalCarNumber, r.returnAddress, r.arrivalAddress, r.fuelLevel || null, r.fuelDisplay || null, r.mileage || 0, r.notes, r.status || "회차등록", r.isCompleted ? 1 : 0
    ).run();

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 });
  }
}

export async function onRequestPatch({ request, env }: { request: Request, env: Env }) {
  try {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return Response.json({ error: "id is required" }, { status: 400 });
    const updates = await request.json() as any;
    const fields = [];
    const values = [];
    if (updates.rentalCarNumber !== undefined) { fields.push("rental_car_number = ?"); values.push(updates.rentalCarNumber); }
    if (updates.returnAddress !== undefined) { fields.push("return_address = ?"); values.push(updates.returnAddress); }
    if (updates.arrivalAddress !== undefined) { fields.push("arrival_address = ?"); values.push(updates.arrivalAddress); }
    if (updates.fuelDisplay !== undefined) { fields.push("fuel_display = ?"); values.push(updates.fuelDisplay); }
    if (updates.mileage !== undefined) { fields.push("mileage = ?"); values.push(updates.mileage); }
    if (updates.notes !== undefined) { fields.push("notes = ?"); values.push(updates.notes); }
    if (updates.status !== undefined) { fields.push("status = ?"); values.push(updates.status); }
    if (updates.isCompleted !== undefined) { fields.push("is_completed = ?"); values.push(updates.isCompleted ? 1 : 0); }
    if (fields.length === 0) return Response.json({ success: true });
    values.push(id);
    await env.DB.prepare(`UPDATE returns SET ${fields.join(", ")} WHERE id = ?`).bind(...values).run();
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 });
  }
}

export async function onRequestDelete({ request, env }: { request: Request, env: Env }) {
  try {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return Response.json({ error: "id is required" }, { status: 400 });
    await env.DB.prepare("DELETE FROM returns WHERE id = ?").bind(id).run();
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 });
  }
}

function mapReturn(row: any) {
  return {
    id: row.id,
    rentalCarNumber: row.rental_car_number,
    returnAddress: row.return_address,
    arrivalAddress: row.arrival_address,
    fuelLevel: row.fuel_level,
    fuelDisplay: row.fuel_display,
    mileage: row.mileage,
    notes: row.notes,
    status: row.status,
    isCompleted: Boolean(row.is_completed),
    createdAt: row.created_at
  };
}
