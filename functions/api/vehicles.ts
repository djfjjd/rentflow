import { vehicles as seedVehicles } from "../../lib/erp-data";

type Env = {
  DB: any;
};

export async function onRequestGet({ env }: { env: Env }) {
  try {
    const { results } = await env.DB.prepare("SELECT * FROM vehicles ORDER BY sort_order ASC, plate_number ASC").all();
    
    // Seed if empty
    if (results.length === 0) {
      const stmt = env.DB.prepare(
        "INSERT INTO vehicles (id, plate_number, model, fuel_type, fuel_level, mileage, location, status, sort_order, memo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      );
      
      const batch = seedVehicles.map((v, index) => 
        stmt.bind(v.id, v.plateNumber, v.model, v.fuelType, v.fuelLevel, v.mileage, v.location, v.status, index, v.memo)
      );
      
      await env.DB.batch(batch);
      
      const { results: seededResults } = await env.DB.prepare("SELECT * FROM vehicles ORDER BY sort_order ASC, plate_number ASC").all();
      return Response.json(seededResults.map(mapVehicle));
    }

    return Response.json(results.map(mapVehicle));
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 });
  }
}

export async function onRequestPost({ request, env }: { request: Request, env: Env }) {
  try {
    const vehicle = await request.json() as any;
    
    // Get max sort_order
    const maxSortOrder = await env.DB.prepare("SELECT MAX(sort_order) as maxOrder FROM vehicles").first("maxOrder") || 0;
    
    await env.DB.prepare(
      "INSERT INTO vehicles (id, plate_number, model, fuel_type, fuel_level, mileage, location, status, sort_order, memo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(
      vehicle.id,
      vehicle.plateNumber,
      vehicle.model,
      vehicle.fuelType,
      vehicle.fuelLevel || 0,
      vehicle.mileage || 0,
      vehicle.location || "본사 주차장",
      vehicle.status || "대기중",
      (vehicle.sortOrder !== undefined ? vehicle.sortOrder : (Number(maxSortOrder) + 1)),
      vehicle.memo
    ).run();

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 });
  }
}

export async function onRequestPatch({ request, env }: { request: Request, env: Env }) {
  try {
    const url = new URL(request.url);
    const plateNumber = url.searchParams.get("plateNumber");
    if (!plateNumber) return Response.json({ error: "plateNumber is required" }, { status: 400 });

    const updates = await request.json() as any;
    
    // Construct dynamic update query
    const fields = [];
    const values = [];
    
    if (updates.model !== undefined) { fields.push("model = ?"); values.push(updates.model); }
    if (updates.fuelType !== undefined) { fields.push("fuel_type = ?"); values.push(updates.fuelType); }
    if (updates.fuelLevel !== undefined) { fields.push("fuel_level = ?"); values.push(updates.fuelLevel); }
    if (updates.mileage !== undefined) { fields.push("mileage = ?"); values.push(updates.mileage); }
    if (updates.location !== undefined) { fields.push("location = ?"); values.push(updates.location); }
    if (updates.status !== undefined) { fields.push("status = ?"); values.push(updates.status); }
    if (updates.sortOrder !== undefined) { fields.push("sort_order = ?"); values.push(updates.sortOrder); }
    if (updates.memo !== undefined) { fields.push("memo = ?"); values.push(updates.memo); }
    
    if (fields.length === 0) return Response.json({ success: true });
    
    fields.push("updated_at = CURRENT_TIMESTAMP");
    values.push(plateNumber);
    
    await env.DB.prepare(
      `UPDATE vehicles SET ${fields.join(", ")} WHERE plate_number = ?`
    ).bind(...values).run();

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 });
  }
}

export async function onRequestDelete({ request, env }: { request: Request, env: Env }) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) return Response.json({ error: "id is required" }, { status: 400 });

    await env.DB.prepare("DELETE FROM vehicles WHERE id = ?").bind(id).run();
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 });
  }
}

function mapVehicle(row: any) {
  return {
    id: row.id,
    plateNumber: row.plate_number,
    model: row.model,
    fuelType: row.fuel_type,
    fuelLevel: row.fuel_level,
    mileage: row.mileage,
    location: row.location,
    status: row.status,
    sortOrder: row.sort_order,
    memo: row.memo,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
