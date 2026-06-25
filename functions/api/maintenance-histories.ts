import { ensureColumns, noStoreHeaders, safeBindValues, safeBoolInt, safeJson, safeNullableText, safeNumber, safeText } from "./_d1-utils";

type Env = {
  DB: any;
};

export async function onRequestGet({ env }: { env: Env }) {
  try {
    await ensureMaintenanceHistorySchema(env);
    const { results } = await env.DB.prepare("SELECT * FROM maintenance_histories ORDER BY created_at DESC").all();

    return Response.json(results.map(mapHistory), { headers: noStoreHeaders() });
  } catch (error) {
    console.error("maintenance history list failed", { error: error instanceof Error ? error.message : String(error) });
    return Response.json({ error: String(error) }, { status: 500 });
  }
}

export async function onRequestPatch({ request, env }: { request: Request, env: Env }) {
  try {
    await ensureMaintenanceHistorySchema(env);
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return Response.json({ error: "id is required" }, { status: 400 });
    const updates = await request.json() as any;
    const fields = [];
    const values = [];
    if (updates.isCompleted !== undefined || updates.completed !== undefined || updates.repaired !== undefined) {
      const completed = safeBoolInt(updates.isCompleted ?? updates.completed ?? updates.repaired);
      fields.push("is_completed = ?", "completed = ?", "repaired = ?", "completed_at = ?");
      values.push(completed, completed, completed, completed ? safeNullableText(updates.completedAt || new Date().toISOString()) : null);
    }
    if (updates.status !== undefined) { fields.push("status = ?"); values.push(safeText(updates.status)); }
    if (fields.length === 0) return Response.json({ success: true }, { headers: noStoreHeaders() });
    values.push(id);
    await env.DB.prepare(`UPDATE maintenance_histories SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(...safeBindValues(values)).run();
    return Response.json({ ok: true, success: true, id: safeText(id) }, { headers: noStoreHeaders() });
  } catch (error) {
    console.error("maintenance history update failed", { error: error instanceof Error ? error.message : String(error) });
    return Response.json({ error: String(error) }, { status: 500 });
  }
}

export async function onRequestPost({ request, env }: { request: Request, env: Env }) {
  try {
    await ensureMaintenanceHistorySchema(env);
    const mh = await request.json() as any;
    const date = mh.date ?? mh.foundDate;
    const vehicleNumber = mh.vehicleNumber ?? mh.plateNumber;
    const content = mh.maintenanceContent ?? mh.title ?? mh.description ?? mh.maintenanceType;
    await env.DB.prepare(
      "INSERT INTO maintenance_histories (id, date, vehicle_number, maintenance_content, vehicle_id, plate_number, maintenance_type, title, description, repair_shop_id, repair_shop_name, found_date, scheduled_date, completed_date, mileage, cost, priority, status, is_completed, photos, videos, documents, linked_dispatch_id, linked_return_id, linked_smart_inbox_item_id, memo, created_by, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)"
    ).bind(
      safeText(mh.id),
      safeNullableText(date),
      safeText(vehicleNumber),
      safeText(content || "정비"),
      safeNullableText(mh.vehicleId),
      safeText(vehicleNumber),
      safeText(mh.maintenanceType || "기타"),
      safeText(content || "정비"),
      safeText(mh.description || content),
      safeNullableText(mh.repairShopId),
      safeText(mh.repairShopName),
      safeNullableText(mh.foundDate),
      safeNullableText(mh.scheduledDate),
      safeNullableText(mh.completedDate),
      safeNumber(mh.mileage) || 0,
      safeNumber(mh.cost) || 0,
      safeText(mh.priority || "보통"),
      safeText(mh.status || "정비필요"),
      safeBoolInt(mh.isCompleted),
      safeJson(mh.photos),
      safeJson(mh.videos),
      safeJson(mh.documents),
      safeNullableText(mh.linkedDispatchId),
      safeNullableText(mh.linkedReturnId),
      safeNullableText(mh.linkedSmartInboxItemId),
      safeText(mh.memo),
      safeText(mh.createdBy || "field")
    ).run();

    console.log("saved maintenance id", mh.id);
    return Response.json({ ok: true, success: true, id: safeText(mh.id) }, { headers: noStoreHeaders() });
  } catch (error) {
    console.error("maintenance history save failed", { error: error instanceof Error ? error.message : String(error) });
    return Response.json({ error: String(error) }, { status: 500 });
  }
}

function mapHistory(row: any) {
  return {
    id: row.id,
    vehicleId: row.vehicle_id,
    plateNumber: row.vehicle_number || row.plate_number,
    vehicleNumber: row.vehicle_number || row.plate_number,
    maintenanceType: row.maintenance_type || row.maintenance_content,
    title: row.maintenance_content || row.title,
    description: row.description || row.maintenance_content,
    maintenanceContent: row.maintenance_content || row.title,
    repairShopId: row.repair_shop_id,
    repairShopName: row.repair_shop_name,
    foundDate: row.date || row.found_date,
    date: row.date || row.found_date,
    scheduledDate: row.scheduled_date,
    completedDate: row.completed_date,
    mileage: row.mileage,
    cost: row.cost,
    priority: row.priority,
    status: row.status,
    isCompleted: Boolean(row.is_completed),
    completed: Boolean(row.completed ?? row.is_completed),
    repaired: Boolean(row.repaired ?? row.is_completed),
    completedAt: row.completed_at,
    photos: JSON.parse(row.photos || "[]"),
    videos: JSON.parse(row.videos || "[]"),
    documents: JSON.parse(row.documents || "[]"),
    linkedDispatchId: row.linked_dispatch_id,
    linkedReturnId: row.linked_return_id,
    linkedSmartInboxItemId: row.linked_smart_inbox_item_id,
    memo: row.memo,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function ensureMaintenanceHistorySchema(env: Env) {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS maintenance_histories (
      id TEXT PRIMARY KEY,
      date TEXT,
      vehicle_number TEXT,
      maintenance_content TEXT,
      memo TEXT,
      is_completed INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
  await ensureColumns(env.DB, "maintenance_histories", [
    { name: "date", definition: "TEXT" },
    { name: "vehicle_number", definition: "TEXT" },
    { name: "maintenance_content", definition: "TEXT" },
    { name: "vehicle_id", definition: "TEXT" },
    { name: "plate_number", definition: "TEXT" },
    { name: "maintenance_type", definition: "TEXT" },
    { name: "title", definition: "TEXT" },
    { name: "description", definition: "TEXT" },
    { name: "repair_shop_id", definition: "TEXT" },
    { name: "repair_shop_name", definition: "TEXT" },
    { name: "found_date", definition: "TEXT" },
    { name: "scheduled_date", definition: "TEXT" },
    { name: "completed_date", definition: "TEXT" },
    { name: "mileage", definition: "INTEGER" },
    { name: "cost", definition: "REAL DEFAULT 0" },
    { name: "priority", definition: "TEXT" },
    { name: "status", definition: "TEXT" },
    { name: "is_completed", definition: "INTEGER DEFAULT 0" },
    { name: "completed", definition: "INTEGER DEFAULT 0" },
    { name: "repaired", definition: "INTEGER DEFAULT 0" },
    { name: "completed_at", definition: "DATETIME" },
    { name: "photos", definition: "TEXT" },
    { name: "videos", definition: "TEXT" },
    { name: "documents", definition: "TEXT" },
    { name: "linked_dispatch_id", definition: "TEXT" },
    { name: "linked_return_id", definition: "TEXT" },
    { name: "linked_smart_inbox_item_id", definition: "TEXT" },
    { name: "memo", definition: "TEXT" },
    { name: "created_by", definition: "TEXT" },
    { name: "updated_at", definition: "DATETIME" },
  ]);
}
