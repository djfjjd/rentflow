import { accidentHistories as seedAccidentHistories } from "../../lib/erp-data";

type Env = {
  DB: any;
};

export async function onRequestGet({ env }: { env: Env }) {
  try {
    const { results } = await env.DB.prepare("SELECT * FROM accident_histories ORDER BY created_at DESC").all();
    
    // Seed if empty
    if (results.length === 0 && seedAccidentHistories.length > 0) {
      const stmt = env.DB.prepare(
        "INSERT INTO accident_histories (id, vehicle_id, plate_number, insurance_number, accident_date, accident_location, accident_type, accident_part, description, customer_name, customer_car_number, customer_car_model, insurance_company, repair_shop_id, repair_shop_name, repair_cost, claim_amount, photos, videos, documents, status, linked_dispatch_id, linked_return_id, linked_smart_inbox_item_id, memo, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      );
      
      const batch = seedAccidentHistories.map(ah => 
        stmt.bind(ah.id, ah.vehicleId, ah.plateNumber, ah.insuranceNumber, ah.accidentDate, ah.accidentLocation, ah.accidentType, ah.accidentPart, ah.description, ah.customerName, ah.customerCarNumber, ah.customerCarModel, ah.insuranceCompany, ah.repairShopId || null, ah.repairShopName, ah.repairCost, ah.claimAmount, JSON.stringify(ah.photos), JSON.stringify(ah.videos), JSON.stringify(ah.documents), ah.status, ah.linkedDispatchId || null, ah.linkedReturnId || null, ah.linkedSmartInboxItemId || null, ah.memo, ah.createdBy)
      );
      
      await env.DB.batch(batch);
      
      const { results: seededResults } = await env.DB.prepare("SELECT * FROM accident_histories ORDER BY created_at DESC").all();
      return Response.json(seededResults.map(mapHistory));
    }

    return Response.json(results.map(mapHistory));
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 });
  }
}

export async function onRequestPost({ request, env }: { request: Request, env: Env }) {
  try {
    const ah = await request.json() as any;
    await env.DB.prepare(
      "INSERT INTO accident_histories (id, vehicle_id, plate_number, insurance_number, accident_date, accident_location, accident_type, accident_part, description, customer_name, customer_car_number, customer_car_model, insurance_company, repair_shop_id, repair_shop_name, repair_cost, claim_amount, photos, videos, documents, status, linked_dispatch_id, linked_return_id, linked_smart_inbox_item_id, memo, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(
      ah.id,
      ah.vehicleId || null,
      ah.plateNumber || "",
      ah.insuranceNumber || "",
      ah.accidentDate || null,
      ah.accidentLocation || null,
      ah.accidentType || "기타",
      ah.accidentPart || "기타",
      ah.description || "",
      ah.customerName || "",
      ah.customerCarNumber || "",
      ah.customerCarModel || "",
      ah.insuranceCompany || "",
      ah.repairShopId || null,
      ah.repairShopName || "",
      ah.repairCost || 0,
      ah.claimAmount || 0,
      JSON.stringify(ah.photos || []),
      JSON.stringify(ah.videos || []),
      JSON.stringify(ah.documents || []),
      ah.status || "접수",
      ah.linkedDispatchId || null,
      ah.linkedReturnId || null,
      ah.linkedSmartInboxItemId || null,
      ah.memo || "",
      ah.createdBy || "field"
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
    insuranceNumber: row.insurance_number,
    accidentDate: row.accident_date,
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
    linkedDispatchId: row.linked_dispatch_id,
    linkedReturnId: row.linked_return_id,
    linkedSmartInboxItemId: row.linked_smart_inbox_item_id,
    memo: row.memo,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
