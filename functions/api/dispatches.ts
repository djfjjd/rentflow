import { dispatches as seedDispatches } from "../../lib/erp-data";
import { ensureColumns, safeBindValues, safeBoolInt, safeNullableText, safeText } from "./_d1-utils";

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
    const vehicleNumber = d.vehicleNumber ?? d.rentalCarNumber;
    const dispatchType = d.dispatchType ?? d.businessType;
    const orderer = d.orderer ?? d.orderedBy;
    const repairShop = d.repairShop ?? d.repair_shop;
    const customerCarModel = d.customerCarModel ?? d.customer_car_model;
    const fuelLevelText = d.fuelLevelText ?? d.fuel_level_text ?? d.fuelDisplay;
    const customerPhone = d.customerPhone ?? d.customer_phone;
    const memo = d.memo ?? d.notes;
    const isCorporate = safeBoolInt(d.isCorporate ?? d.is_corporate ?? d.corporateVehicle);
    await env.DB.prepare(
      "INSERT INTO dispatches (id, date, time, vehicle_number, dispatch_type, orderer, repair_shop, customer_car_model, fuel_level_text, customer_phone, memo, is_corporate, is_completed, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
    ).bind(
      safeText(d.id),
      safeNullableText(d.date),
      safeNullableText(d.time),
      safeText(vehicleNumber),
      safeText(dispatchType),
      safeText(orderer),
      safeText(repairShop),
      safeText(customerCarModel),
      safeText(fuelLevelText),
      safeText(customerPhone),
      safeText(memo),
      isCorporate,
      safeBoolInt(d.isCompleted)
    ).run();

    console.log("saved dispatch id", d.id);
    return Response.json({ ok: true, success: true, id: safeText(d.id) });
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

    const body = await request.json() as any;
    const vehicleNumber = body.vehicleNumber ?? body.vehicle_number ?? body.rentalCarNumber;
    const dispatchType = body.dispatchType ?? body.dispatch_type ?? body.businessType;
    const orderer = body.orderer ?? body.orderedBy;
    const repairShop = body.repairShop ?? body.repair_shop;
    const customerCarModel = body.customerCarModel ?? body.customer_car_model;
    const fuelLevelText = body.fuelLevelText ?? body.fuel_level_text ?? body.fuelDisplay;
    const customerPhone = body.customerPhone ?? body.customer_phone;
    const memo = body.memo ?? body.notes;
    const isCorporate = body.isCorporate ?? body.is_corporate ?? body.corporateVehicle;

    await env.DB.prepare(
      `UPDATE dispatches SET
        date = ?,
        time = ?,
        vehicle_number = ?,
        dispatch_type = ?,
        orderer = ?,
        repair_shop = ?,
        customer_car_model = ?,
        fuel_level_text = ?,
        customer_phone = ?,
        memo = ?,
        is_corporate = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`
    ).bind(
      safeNullableText(body.date),
      safeNullableText(body.time),
      safeText(vehicleNumber),
      safeText(dispatchType),
      safeText(orderer),
      safeText(repairShop),
      safeText(customerCarModel),
      safeText(fuelLevelText),
      safeText(customerPhone),
      safeText(memo),
      safeBoolInt(isCorporate),
      safeText(id)
    ).run();

    return Response.json({ ok: true, success: true, id: safeText(id) });
  } catch (error) {
    console.error("dispatch update failed", { error: error instanceof Error ? error.message : String(error) });
    return Response.json({ error: String(error) }, { status: 500 });
  }
}

export const onRequestPut = onRequestPatch;

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
    vehicleNumber: row.vehicle_number || row.rental_car_number,
    rentalCarNumber: row.vehicle_number || row.rental_car_number,
    orderer: row.orderer || row.ordered_by,
    orderedBy: row.orderer || row.ordered_by,
    repairShop: row.repair_shop,
    pickupAddress: row.pickup_address,
    deliveryAddress: row.delivery_address,
    fuelLevel: row.fuel_level,
    fuelDisplay: row.fuel_level_text || row.fuel_display,
    fuelLevelText: row.fuel_level_text || row.fuel_display,
    vehicleColor: row.vehicle_color,
    dispatchType: row.dispatch_type || row.business_type,
    businessType: row.dispatch_type || row.business_type,
    corporateVehicle: Boolean(row.is_corporate ?? row.corporate_vehicle),
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
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS dispatches (
      id TEXT PRIMARY KEY,
      date TEXT,
      time TEXT,
      vehicle_number TEXT,
      dispatch_type TEXT,
      orderer TEXT,
      repair_shop TEXT,
      customer_car_model TEXT,
      fuel_level_text TEXT,
      customer_phone TEXT,
      memo TEXT,
      is_corporate INTEGER DEFAULT 0,
      is_completed INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
  await ensureColumns(env.DB, "dispatches", [
    { name: "vehicle_number", definition: "TEXT" },
    { name: "dispatch_type", definition: "TEXT" },
    { name: "orderer", definition: "TEXT" },
    { name: "claim_number", definition: "TEXT" },
    { name: "customer_name", definition: "TEXT NOT NULL DEFAULT ''" },
    { name: "customer_phone", definition: "TEXT" },
    { name: "customer_car_number", definition: "TEXT" },
    { name: "customer_car_model", definition: "TEXT" },
    { name: "rental_car_number", definition: "TEXT" },
    { name: "ordered_by", definition: "TEXT" },
    { name: "repair_shop", definition: "TEXT" },
    { name: "pickup_address", definition: "TEXT" },
    { name: "delivery_address", definition: "TEXT" },
    { name: "fuel_level", definition: "REAL" },
    { name: "fuel_display", definition: "TEXT" },
    { name: "business_type", definition: "TEXT" },
    { name: "notes", definition: "TEXT" },
    { name: "status", definition: "TEXT NOT NULL DEFAULT '배차등록'" },
    { name: "intake_type", definition: "TEXT" },
    { name: "uploaded_at", definition: "DATETIME" },
    { name: "created_at", definition: "DATETIME" },
    { name: "updated_at", definition: "DATETIME" },
    { name: "date", definition: "TEXT" },
    { name: "time", definition: "TEXT" },
    { name: "is_completed", definition: "INTEGER DEFAULT 0" },
    { name: "is_corporate", definition: "INTEGER DEFAULT 0" },
    { name: "corporate_vehicle", definition: "INTEGER DEFAULT 0" },
    { name: "fuel_level_text", definition: "TEXT" },
    { name: "vehicle_color", definition: "TEXT" },
    { name: "memo", definition: "TEXT" },
  ]);
}
