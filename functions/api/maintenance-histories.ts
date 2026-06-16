import { maintenanceHistories as seedMaintenanceHistories } from "../../lib/erp-data";
import { safeBindValues, safeJson, safeNullableText, safeNumber, safeText } from "./_d1-utils";

type Env = {
  DB: any;
};

export async function onRequestGet({ env }: { env: Env }) {
  try {
    const { results } = await env.DB.prepare("SELECT * FROM maintenance_histories ORDER BY created_at DESC").all();
    
    // Seed if empty
    if (results.length === 0 && seedMaintenanceHistories.length > 0) {
      const stmt = env.DB.prepare(
        "INSERT INTO maintenance_histories (id, vehicle_id, plate_number, maintenance_type, title, description, repair_shop_id, repair_shop_name, found_date, scheduled_date, completed_date, mileage, cost, priority, status, photos, videos, documents, linked_dispatch_id, linked_return_id, linked_smart_inbox_item_id, memo, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      );
      
      const batch = seedMaintenanceHistories.map(mh => 
        stmt.bind(...safeBindValues([mh.id, mh.vehicleId, mh.plateNumber, mh.maintenanceType, mh.title, mh.description, mh.repairShopId || null, mh.repairShopName, mh.foundDate, mh.scheduledDate || null, mh.completedDate || null, mh.mileage, mh.cost, mh.priority, mh.status, JSON.stringify(mh.photos), JSON.stringify(mh.videos), JSON.stringify(mh.documents), mh.linkedDispatchId || null, mh.linkedReturnId || null, mh.linkedSmartInboxItemId || null, mh.memo, mh.createdBy]))
      );
      
      await env.DB.batch(batch);
      
      const { results: seededResults } = await env.DB.prepare("SELECT * FROM maintenance_histories ORDER BY created_at DESC").all();
      return Response.json(seededResults.map(mapHistory));
    }

    return Response.json(results.map(mapHistory));
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
    if (updates.isCompleted !== undefined) { fields.push("is_completed = ?"); values.push(updates.isCompleted ? 1 : 0); }
    if (updates.status !== undefined) { fields.push("status = ?"); values.push(updates.status); }
    if (fields.length === 0) return Response.json({ success: true });
    values.push(id);
    await env.DB.prepare(`UPDATE maintenance_histories SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(...safeBindValues(values)).run();
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 });
  }
}

export async function onRequestPost({ request, env }: { request: Request, env: Env }) {
  try {
    const mh = await request.json() as any;
    await env.DB.prepare(
      "INSERT INTO maintenance_histories (id, vehicle_id, plate_number, maintenance_type, title, description, repair_shop_id, repair_shop_name, found_date, scheduled_date, completed_date, mileage, cost, priority, status, photos, videos, documents, linked_dispatch_id, linked_return_id, linked_smart_inbox_item_id, memo, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(
      safeText(mh.id),
      safeNullableText(mh.vehicleId),
      safeText(mh.plateNumber),
      safeText(mh.maintenanceType || "기타"),
      safeText(mh.title || "정비"),
      safeText(mh.description),
      safeNullableText(mh.repairShopId),
      safeText(mh.repairShopName),
      safeNullableText(mh.foundDate),
      safeNullableText(mh.scheduledDate),
      safeNullableText(mh.completedDate),
      safeNumber(mh.mileage) || 0,
      safeNumber(mh.cost) || 0,
      safeText(mh.priority || "보통"),
      safeText(mh.status || "정비필요"),
      safeJson(mh.photos),
      safeJson(mh.videos),
      safeJson(mh.documents),
      safeNullableText(mh.linkedDispatchId),
      safeNullableText(mh.linkedReturnId),
      safeNullableText(mh.linkedSmartInboxItemId),
      safeText(mh.memo),
      safeText(mh.createdBy || "field")
    ).run();

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 });
  }
}

function mapHistory(row: any) {
  return {
    id: row.id,
    vehicleId: row.vehicle_id,
    plateNumber: row.plate_number,
    maintenanceType: row.maintenance_type,
    title: row.title,
    description: row.description,
    repairShopId: row.repair_shop_id,
    repairShopName: row.repair_shop_name,
    foundDate: row.found_date,
    scheduledDate: row.scheduled_date,
    completedDate: row.completed_date,
    mileage: row.mileage,
    cost: row.cost,
    priority: row.priority,
    status: row.status,
    isCompleted: Boolean(row.is_completed),
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
