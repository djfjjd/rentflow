import { dispatches as seedDispatches } from "../../lib/erp-data";
import { ensureColumns, safeBindValues, safeBoolInt, safeNullableText, safeNumber, safeText } from "./_d1-utils";

type Env = {
  DB: any;
};

export async function onRequestGet({ env }: { env: Env }) {
  try {
    await ensureDispatchSchema(env);
    const { results } = await env.DB.prepare("SELECT * FROM dispatches ORDER BY created_at DESC").all();
    
    // Seed if empty
    if (results.length === 0 && seedDispatches.length > 0) {
      const stmt = env.DB.prepare(
        "INSERT INTO dispatches (id, claim_number, customer_name, customer_phone, customer_car_number, customer_car_model, rental_car_number, ordered_by, repair_shop, pickup_address, delivery_address, fuel_level, notes, status, intake_type, uploaded_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      );
      
      const batch = seedDispatches.map(d => 
        stmt.bind(...safeBindValues([d.id, d.claimNumber, d.customerName, d.customerPhone, d.customerCarNumber, d.customerCarModel, d.rentalCarNumber, d.orderedBy, d.repairShop, d.pickupAddress, d.deliveryAddress, d.fuelLevel, d.notes, d.status, d.intakeType || null, d.uploadedAt || null]))
      );
      
      await env.DB.batch(batch);
      
      const { results: seededResults } = await env.DB.prepare("SELECT * FROM dispatches ORDER BY created_at DESC").all();
      return Response.json(seededResults.map(mapDispatch));
    }

    return Response.json(results.map(mapDispatch));
  } catch (error) {
    console.error("dispatch list failed", { error: error instanceof Error ? error.message : String(error) });
    return Response.json({ error: String(error) }, { status: 500 });
  }
}

export async function onRequestPost({ request, env }: { request: Request, env: Env }) {
  try {
    await ensureDispatchSchema(env);
    const d = await request.json() as any;
    const fuelLevelText = d.fuelLevelText ?? d.fuelDisplay;
    const memo = d.memo ?? d.notes;
    await env.DB.prepare(
      "INSERT INTO dispatches (id, date, time, claim_number, customer_name, customer_phone, customer_car_number, customer_car_model, rental_car_number, ordered_by, repair_shop, pickup_address, delivery_address, fuel_level, fuel_display, fuel_level_text, vehicle_color, business_type, corporate_vehicle, notes, memo, status, intake_type, uploaded_at, is_completed) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(
      safeText(d.id),
      safeNullableText(d.date),
      safeNullableText(d.time),
      safeNullableText(d.claimNumber),
      safeText(d.customerName),
      safeText(d.customerPhone),
      safeText(d.customerCarNumber),
      safeText(d.customerCarModel),
      safeText(d.rentalCarNumber),
      safeText(d.orderedBy),
      safeText(d.repairShop),
      safeText(d.pickupAddress),
      safeText(d.deliveryAddress),
      safeNumber(d.fuelLevel),
      safeText(fuelLevelText),
      safeText(fuelLevelText),
      safeText(d.vehicleColor),
      safeNullableText(d.businessType),
      safeBoolInt(d.corporateVehicle),
      safeText(memo),
      safeText(memo),
      safeText(d.status || "배차등록"),
      safeNullableText(d.intakeType),
      safeNullableText(d.uploadedAt),
      safeBoolInt(d.isCompleted)
    ).run();

    return Response.json({ success: true });
  } catch (error) {
    console.error("dispatch save failed", { error: error instanceof Error ? error.message : String(error) });
    return Response.json({ error: String(error) }, { status: 500 });
  }
}

export async function onRequestPatch({ request, env }: { request: Request, env: Env }) {
  try {
    await ensureDispatchSchema(env);
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) return Response.json({ error: "id is required" }, { status: 400 });

    const updates = await request.json() as any;
    const fields = [];
    const values = [];
    
    if (updates.status !== undefined) { fields.push("status = ?"); values.push(safeText(updates.status)); }
    if (updates.date !== undefined) { fields.push("date = ?"); values.push(safeNullableText(updates.date)); }
    if (updates.time !== undefined) { fields.push("time = ?"); values.push(safeNullableText(updates.time)); }
    if (updates.businessType !== undefined) { fields.push("business_type = ?"); values.push(safeText(updates.businessType)); }
    if (updates.corporateVehicle !== undefined) { fields.push("corporate_vehicle = ?"); values.push(safeBoolInt(updates.corporateVehicle)); }
    if (updates.rentalCarNumber !== undefined) { fields.push("rental_car_number = ?"); values.push(safeText(updates.rentalCarNumber)); }
    if (updates.customerName !== undefined) { fields.push("customer_name = ?"); values.push(safeText(updates.customerName)); }
    if (updates.customerPhone !== undefined) { fields.push("customer_phone = ?"); values.push(safeText(updates.customerPhone)); }
    if (updates.customerCarModel !== undefined) { fields.push("customer_car_model = ?"); values.push(safeText(updates.customerCarModel)); }
    if (updates.orderedBy !== undefined) { fields.push("ordered_by = ?"); values.push(safeText(updates.orderedBy)); }
    if (updates.repairShop !== undefined) { fields.push("repair_shop = ?"); values.push(safeText(updates.repairShop)); }
    if (updates.claimNumber !== undefined) { fields.push("claim_number = ?"); values.push(safeNullableText(updates.claimNumber)); }
    if (updates.notes !== undefined || updates.memo !== undefined) {
      const memo = updates.memo ?? updates.notes;
      fields.push("notes = ?", "memo = ?");
      values.push(safeText(memo), safeText(memo));
    }
    if (updates.fuelLevel !== undefined) { fields.push("fuel_level = ?"); values.push(safeNumber(updates.fuelLevel)); }
    if (updates.fuelDisplay !== undefined || updates.fuelLevelText !== undefined) {
      const fuelLevelText = updates.fuelLevelText ?? updates.fuelDisplay;
      fields.push("fuel_display = ?", "fuel_level_text = ?");
      values.push(safeText(fuelLevelText), safeText(fuelLevelText));
    }
    if (updates.vehicleColor !== undefined) { fields.push("vehicle_color = ?"); values.push(safeText(updates.vehicleColor)); }
    if (updates.isCompleted !== undefined) { fields.push("is_completed = ?"); values.push(safeBoolInt(updates.isCompleted)); }
    
    if (fields.length === 0) return Response.json({ success: true });
    
    values.push(id);
    
    await env.DB.prepare(
      `UPDATE dispatches SET ${fields.join(", ")} WHERE id = ?`
    ).bind(...safeBindValues(values)).run();

    return Response.json({ success: true });
  } catch (error) {
    console.error("dispatch update failed", { error: error instanceof Error ? error.message : String(error) });
    return Response.json({ error: String(error) }, { status: 500 });
  }
}

export async function onRequestDelete({ request, env }: { request: Request, env: Env }) {
  try {
    await ensureDispatchSchema(env);
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return Response.json({ error: "id is required" }, { status: 400 });
    await env.DB.prepare("DELETE FROM dispatches WHERE id = ?").bind(safeText(id)).run();
    return Response.json({ success: true });
  } catch (error) {
    console.error("dispatch delete failed", { error: error instanceof Error ? error.message : String(error) });
    return Response.json({ error: String(error) }, { status: 500 });
  }
}

function mapDispatch(row: any) {
  return {
    id: row.id,
    date: row.date,
    time: row.time,
    claimNumber: row.claim_number,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    customerCarNumber: row.customer_car_number,
    customerCarModel: row.customer_car_model,
    rentalCarNumber: row.rental_car_number,
    orderedBy: row.ordered_by,
    repairShop: row.repair_shop,
    pickupAddress: row.pickup_address,
    deliveryAddress: row.delivery_address,
    fuelLevel: row.fuel_level,
    fuelDisplay: row.fuel_level_text || row.fuel_display,
    fuelLevelText: row.fuel_level_text || row.fuel_display,
    vehicleColor: row.vehicle_color,
    businessType: row.business_type,
    corporateVehicle: Boolean(row.corporate_vehicle),
    isCompleted: Boolean(row.is_completed),
    notes: row.memo || row.notes,
    memo: row.memo || row.notes,
    status: row.status,
    intakeType: row.intake_type,
    uploadedAt: row.uploaded_at,
    createdAt: row.created_at
  };
}

async function ensureDispatchSchema(env: Env) {
  await ensureColumns(env.DB, "dispatches", [
    { name: "date", definition: "TEXT" },
    { name: "time", definition: "TEXT" },
    { name: "is_completed", definition: "INTEGER DEFAULT 0" },
    { name: "fuel_level_text", definition: "TEXT" },
    { name: "vehicle_color", definition: "TEXT" },
    { name: "memo", definition: "TEXT" },
  ]);
}
