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
      "INSERT INTO dispatches (id, claim_number, customer_name, customer_phone, customer_car_number, customer_car_model, rental_car_number, ordered_by, repair_shop, pickup_address, delivery_address, fuel_level, notes, status, intake_type, uploaded_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
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
      d.fuelLevel,
      d.notes,
      d.status,
      d.intakeType || null,
      d.uploadedAt || null
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
    if (updates.notes !== undefined) { fields.push("notes = ?"); values.push(updates.notes); }
    if (updates.fuelLevel !== undefined) { fields.push("fuel_level = ?"); values.push(updates.fuelLevel); }
    
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
    notes: row.notes,
    status: row.status,
    intakeType: row.intake_type,
    uploadedAt: row.uploaded_at,
    createdAt: row.created_at
  };
}
