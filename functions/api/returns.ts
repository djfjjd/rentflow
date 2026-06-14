import { returns as seedReturns } from "../../lib/erp-data";

type Env = {
  DB: any;
};

export async function onRequestGet({ env }: { env: Env }) {
  try {
    const { results } = await env.DB.prepare("SELECT * FROM returns ORDER BY created_at DESC").all();
    
    // Seed if empty
    if (results.length === 0 && seedReturns.length > 0) {
      const stmt = env.DB.prepare(
        "INSERT INTO returns (id, rental_car_number, return_address, arrival_address, fuel_level, mileage, notes, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      );
      
      const batch = seedReturns.map(r => 
        stmt.bind(r.id, r.rentalCarNumber, r.returnAddress, r.arrivalAddress, r.fuelLevel, r.mileage, r.notes, r.status)
      );
      
      await env.DB.batch(batch);
      
      const { results: seededResults } = await env.DB.prepare("SELECT * FROM returns ORDER BY created_at DESC").all();
      return Response.json(seededResults.map(mapReturn));
    }

    return Response.json(results.map(mapReturn));
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 });
  }
}

export async function onRequestPost({ request, env }: { request: Request, env: Env }) {
  try {
    const r = await request.json() as any;
    await env.DB.prepare(
      "INSERT INTO returns (id, rental_car_number, return_address, arrival_address, fuel_level, mileage, notes, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(
      r.id, r.rentalCarNumber, r.returnAddress, r.arrivalAddress, r.fuelLevel, r.mileage, r.notes, r.status
    ).run();

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 });
  }
}

function mapReturn(row: any) {
  return {
    id: row.id,
    rentalCarNumber: row.rental_car_number,
    returnAddress: row.return_address,
    arrivalAddress: row.arrival_address,
    fuelLevel: row.fuel_level,
    mileage: row.mileage,
    notes: row.notes,
    status: row.status,
    createdAt: row.created_at
  };
}
