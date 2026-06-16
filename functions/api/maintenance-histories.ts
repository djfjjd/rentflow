import { maintenanceHistories as seedMaintenanceHistories } from "../../lib/erp-data";

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
        stmt.bind(mh.id, mh.vehicleId, mh.plateNumber, mh.maintenanceType, mh.title, mh.description, mh.repairShopId || null, mh.repairShopName, mh.foundDate, mh.scheduledDate || null, mh.completedDate || null, mh.mileage, mh.cost, mh.priority, mh.status, JSON.stringify(mh.photos), JSON.stringify(mh.videos), JSON.stringify(mh.documents), mh.linkedDispatchId || null, mh.linkedReturnId || null, mh.linkedSmartInboxItemId || null, mh.memo, mh.createdBy)
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

export async function onRequestPost({ request, env }: { request: Request, env: Env }) {
  try {
    const mh = await request.json() as any;
    await env.DB.prepare(
      "INSERT INTO maintenance_histories (id, vehicle_id, plate_number, maintenance_type, title, description, repair_shop_id, repair_shop_name, found_date, scheduled_date, completed_date, mileage, cost, priority, status, photos, videos, documents, linked_dispatch_id, linked_return_id, linked_smart_inbox_item_id, memo, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(
      mh.id,
      mh.vehicleId || null,
      mh.plateNumber || "",
      mh.maintenanceType || "기타",
      mh.title || "정비",
      mh.description || "",
      mh.repairShopId || null,
      mh.repairShopName || "",
      mh.foundDate || null,
      mh.scheduledDate || null,
      mh.completedDate || null,
      mh.mileage || 0,
      mh.cost || 0,
      mh.priority || "보통",
      mh.status || "정비필요",
      JSON.stringify(mh.photos || []),
      JSON.stringify(mh.videos || []),
      JSON.stringify(mh.documents || []),
      mh.linkedDispatchId || null,
      mh.linkedReturnId || null,
      mh.linkedSmartInboxItemId || null,
      mh.memo || "",
      mh.createdBy || "field"
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
