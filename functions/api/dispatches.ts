import { dispatches as seedDispatches } from "../../lib/erp-data";

type Env = {
  DB: any;
};

export async function onRequestGet({ env }: { env: Env }) {
  try {
    const { results } = await env.DB.prepare("SELECT * FROM dispatches ORDER BY created_at DESC").all();
    
    // Seed if empty
    if (results.length === 0 && seedDispatches.length > 0) {
      const stmt = env.DB.prepare(
        "INSERT INTO dispatches (id, claim_number, customer_name, customer_phone, customer_car_number, customer_car_model, rental_car_number, ordered_by, repair_shop, pickup_address, delivery_address, fuel_level, notes, status, intake_type, uploaded_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      );
      
      const batch = seedDispatches.map(d => 
        stmt.bind(d.id, d.claimNumber, d.customerName, d.customerPhone, d.customerCarNumber, d.customerCarModel, d.rentalCarNumber, d.orderedBy, d.repairShop, d.pickupAddress, d.deliveryAddress, d.fuelLevel, d.notes, d.status, d.intakeType || null, d.uploadedAt || null)
      );
      
      await env.DB.batch(batch);
      
      const { results: seededResults } = await env.DB.prepare("SELECT * FROM dispatches ORDER BY created_at DESC").all();
      return Response.json(seededResults.map(mapDispatch));
    }

    return Response.json(results.map(mapDispatch));
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 });
  }
}

export async function onRequestPost({ request, env }: { request: Request, env: Env }) {
  try {
    const d = await request.json() as any;
    await env.DB.prepare(
      "INSERT INTO dispatches (id, claim_number, customer_name, customer_phone, customer_car_number, customer_car_model, rental_car_number, ordered_by, repair_shop, pickup_address, delivery_address, fuel_level, fuel_display, business_type, corporate_vehicle, notes, status, intake_type, uploaded_at, is_completed) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(
      d.id,
      d.claimNumber,
      d.customerName,
      d.customerPhone,
      d.customerCarNumber,
      d.customerCarModel,
      d.rentalCarNumber,
      d.orderedBy,
      d.repairShop,
      d.pickupAddress,
      d.deliveryAddress,
      d.fuelLevel || null,
      d.fuelDisplay || null,
      d.businessType || null,
      d.corporateVehicle ? 1 : 0,
      d.notes,
      d.status || "배차등록",
      d.intakeType || null,
      d.uploadedAt || null,
      d.isCompleted ? 1 : 0
    ).run();

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 });
  }
}

export async function onRequestPatch({ request, env }: { request: Request, env: Env }) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) return Response.json({ error: "id is required" }, { status: 400 });

    const updates = await request.json() as any;
    const fields = [];
    const values = [];
    
    if (updates.status !== undefined) { fields.push("status = ?"); values.push(updates.status); }
    if (updates.businessType !== undefined) { fields.push("business_type = ?"); values.push(updates.businessType); }
    if (updates.corporateVehicle !== undefined) { fields.push("corporate_vehicle = ?"); values.push(updates.corporateVehicle ? 1 : 0); }
    if (updates.rentalCarNumber !== undefined) { fields.push("rental_car_number = ?"); values.push(updates.rentalCarNumber); }
    if (updates.customerName !== undefined) { fields.push("customer_name = ?"); values.push(updates.customerName); }
    if (updates.customerPhone !== undefined) { fields.push("customer_phone = ?"); values.push(updates.customerPhone); }
    if (updates.customerCarModel !== undefined) { fields.push("customer_car_model = ?"); values.push(updates.customerCarModel); }
    if (updates.orderedBy !== undefined) { fields.push("ordered_by = ?"); values.push(updates.orderedBy); }
    if (updates.repairShop !== undefined) { fields.push("repair_shop = ?"); values.push(updates.repairShop); }
    if (updates.claimNumber !== undefined) { fields.push("claim_number = ?"); values.push(updates.claimNumber); }
    if (updates.notes !== undefined) { fields.push("notes = ?"); values.push(updates.notes); }
    if (updates.fuelLevel !== undefined) { fields.push("fuel_level = ?"); values.push(updates.fuelLevel); }
    if (updates.fuelDisplay !== undefined) { fields.push("fuel_display = ?"); values.push(updates.fuelDisplay); }
    if (updates.isCompleted !== undefined) { fields.push("is_completed = ?"); values.push(updates.isCompleted ? 1 : 0); }
    
    if (fields.length === 0) return Response.json({ success: true });
    
    values.push(id);
    
    await env.DB.prepare(
      `UPDATE dispatches SET ${fields.join(", ")} WHERE id = ?`
    ).bind(...values).run();

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 });
  }
}

export async function onRequestDelete({ request, env }: { request: Request, env: Env }) {
  try {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return Response.json({ error: "id is required" }, { status: 400 });
    await env.DB.prepare("DELETE FROM dispatches WHERE id = ?").bind(id).run();
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 });
  }
}

function mapDispatch(row: any) {
  return {
    id: row.id,
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
    fuelDisplay: row.fuel_display,
    businessType: row.business_type,
    corporateVehicle: Boolean(row.corporate_vehicle),
    isCompleted: Boolean(row.is_completed),
    notes: row.notes,
    status: row.status,
    intakeType: row.intake_type,
    uploadedAt: row.uploaded_at,
    createdAt: row.created_at
  };
}
