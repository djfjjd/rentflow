import { ensureColumns, noStoreHeaders, safeBindValues, safeBoolInt, safeJson, safeNullableText, safeNumber, safeText } from "./_d1-utils";

type Env = {
  DB: any;
};

export async function onRequestGet({ env }: { env: Env }) {
  try {
    await ensureAccidentSchema(env);
    const { results } = await env.DB.prepare("SELECT * FROM accident_histories ORDER BY created_at DESC").all();

    return Response.json(results.map(mapHistory), { headers: noStoreHeaders() });
  } catch (error) {
    console.error("accident history list failed", { error: error instanceof Error ? error.message : String(error) });
    return Response.json({ error: String(error) }, { status: 500 });
  }
}

export async function onRequestPatch({ request, env }: { request: Request, env: Env }) {
  try {
    await ensureAccidentSchema(env);
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return Response.json({ error: "id is required" }, { status: 400 });
    const updates = await request.json() as any;
    const fields = [];
    const values = [];
    if (updates.isCompleted !== undefined) { fields.push("is_completed = ?"); values.push(safeBoolInt(updates.isCompleted)); }
    if (updates.status !== undefined) { fields.push("status = ?"); values.push(safeText(updates.status)); }
    if (fields.length === 0) return Response.json({ success: true }, { headers: noStoreHeaders() });
    values.push(id);
    await env.DB.prepare(`UPDATE accident_histories SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(...safeBindValues(values)).run();
    return Response.json({ ok: true, success: true, id: safeText(id) }, { headers: noStoreHeaders() });
  } catch (error) {
    console.error("accident history update failed", { error: error instanceof Error ? error.message : String(error) });
    return Response.json({ error: String(error) }, { status: 500 });
  }
}

export async function onRequestPost({ request, env }: { request: Request, env: Env }) {
  try {
    await ensureAccidentSchema(env);
    const ah = await request.json() as any;
    const date = ah.date ?? ah.accidentDate;
    const vehicleNumber = ah.vehicleNumber ?? ah.plateNumber;
    await env.DB.prepare(
      "INSERT INTO accident_histories (id, date, vehicle_number, vehicle_id, plate_number, insurance_number, accident_date, accident_location, accident_type, accident_part, description, customer_name, customer_car_number, customer_car_model, insurance_company, repair_shop_id, repair_shop_name, repair_cost, claim_amount, photos, videos, documents, status, is_completed, linked_dispatch_id, linked_return_id, linked_smart_inbox_item_id, memo, created_by, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)"
    ).bind(
      safeText(ah.id),
      safeNullableText(date),
      safeText(vehicleNumber),
      safeNullableText(ah.vehicleId),
      safeText(vehicleNumber),
      safeText(ah.insuranceNumber),
      safeNullableText(date),
      safeNullableText(ah.accidentLocation),
      safeText(ah.accidentType || "기타"),
      safeText(ah.accidentPart || "기타"),
      safeText(ah.description),
      safeText(ah.customerName),
      safeText(ah.customerCarNumber),
      safeText(ah.customerCarModel),
      safeText(ah.insuranceCompany),
      safeNullableText(ah.repairShopId),
      safeText(ah.repairShopName),
      safeNumber(ah.repairCost) || 0,
      safeNumber(ah.claimAmount) || 0,
      safeJson(ah.photos),
      safeJson(ah.videos),
      safeJson(ah.documents),
      safeText(ah.status || "접수"),
      safeBoolInt(ah.isCompleted),
      safeNullableText(ah.linkedDispatchId),
      safeNullableText(ah.linkedReturnId),
      safeNullableText(ah.linkedSmartInboxItemId),
      safeText(ah.memo),
      safeText(ah.createdBy || "field")
    ).run();

    console.log("saved accident id", ah.id);
    return Response.json({ ok: true, success: true, id: safeText(ah.id) }, { headers: noStoreHeaders() });
  } catch (error) {
    console.error("accident history save failed", { error: error instanceof Error ? error.message : String(error) });
    return Response.json({ error: String(error) }, { status: 500 });
  }
}

function mapHistory(row: any) {
  return {
    id: row.id,
    vehicleId: row.vehicle_id,
    plateNumber: row.vehicle_number || row.plate_number,
    vehicleNumber: row.vehicle_number || row.plate_number,
    insuranceNumber: row.insurance_number,
    accidentDate: row.date || row.accident_date,
    date: row.date || row.accident_date,
    accidentLocation: row.accident_location,
    accidentType: row.accident_type,
    accidentPart: row.accident_part,
    description: row.description,
    customerName: row.customer_name,
    customerCarNumber: row.customer_car_number,
    customerCarModel: row.customer_car_model,
    insuranceCompany: row.insurance_company,
    repairShopId: row.repair_shop_id,
    repairShopName: row.repair_shop_name,
    repairCost: row.repair_cost,
    claimAmount: row.claim_amount,
    photos: JSON.parse(row.photos || "[]"),
    videos: JSON.parse(row.videos || "[]"),
    documents: JSON.parse(row.documents || "[]"),
    status: row.status,
    isCompleted: Boolean(row.is_completed),
    linkedDispatchId: row.linked_dispatch_id,
    linkedReturnId: row.linked_return_id,
    linkedSmartInboxItemId: row.linked_smart_inbox_item_id,
    memo: row.memo,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function ensureAccidentSchema(env: Env) {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS accident_histories (
      id TEXT PRIMARY KEY,
      date TEXT,
      vehicle_number TEXT,
      accident_part TEXT,
      memo TEXT,
      is_completed INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
  await ensureColumns(env.DB, "accident_histories", [
    { name: "date", definition: "TEXT" },
    { name: "vehicle_number", definition: "TEXT" },
    { name: "vehicle_id", definition: "TEXT" },
    { name: "plate_number", definition: "TEXT" },
    { name: "insurance_number", definition: "TEXT" },
    { name: "accident_date", definition: "TEXT" },
    { name: "accident_location", definition: "TEXT" },
    { name: "accident_type", definition: "TEXT" },
    { name: "accident_part", definition: "TEXT" },
    { name: "description", definition: "TEXT" },
    { name: "customer_name", definition: "TEXT" },
    { name: "customer_car_number", definition: "TEXT" },
    { name: "customer_car_model", definition: "TEXT" },
    { name: "insurance_company", definition: "TEXT" },
    { name: "repair_shop_id", definition: "TEXT" },
    { name: "repair_shop_name", definition: "TEXT" },
    { name: "repair_cost", definition: "REAL DEFAULT 0" },
    { name: "claim_amount", definition: "REAL DEFAULT 0" },
    { name: "photos", definition: "TEXT" },
    { name: "videos", definition: "TEXT" },
    { name: "documents", definition: "TEXT" },
    { name: "status", definition: "TEXT" },
    { name: "is_completed", definition: "INTEGER DEFAULT 0" },
    { name: "linked_dispatch_id", definition: "TEXT" },
    { name: "linked_return_id", definition: "TEXT" },
    { name: "linked_smart_inbox_item_id", definition: "TEXT" },
    { name: "memo", definition: "TEXT" },
    { name: "created_by", definition: "TEXT" },
    { name: "updated_at", definition: "DATETIME" },
  ]);
}
