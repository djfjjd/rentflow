import { maintenanceItems as seedMaintenance } from "../../lib/erp-data";

type Env = {
  DB: any;
};

export async function onRequestGet({ env }: { env: Env }) {
  try {
    const { results } = await env.DB.prepare("SELECT * FROM maintenance ORDER BY requested_at DESC").all();
    
    // Seed if empty
    if (results.length === 0 && seedMaintenance.length > 0) {
      const stmt = env.DB.prepare(
        "INSERT INTO maintenance (id, vehicle_number, title, requested_at, status) VALUES (?, ?, ?, ?, ?)"
      );
      
      const batch = seedMaintenance.map(m => 
        stmt.bind(m.id, m.vehicleNumber, m.title, m.requestedAt, m.status)
      );
      
      await env.DB.batch(batch);
      
      const { results: seededResults } = await env.DB.prepare("SELECT * FROM maintenance ORDER BY requested_at DESC").all();
      return Response.json(seededResults.map(mapMaintenance));
    }

    return Response.json(results.map(mapMaintenance));
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 });
  }
}

export async function onRequestPost({ request, env }: { request: Request, env: Env }) {
  try {
    const m = await request.json() as any;
    await env.DB.prepare(
      "INSERT INTO maintenance (id, vehicle_number, title, requested_at, status) VALUES (?, ?, ?, ?, ?)"
    ).bind(
      m.id, m.vehicleNumber, m.title, m.requestedAt, m.status
    ).run();

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 });
  }
}

export async function onRequestPut({ request, env }: { request: Request, env: Env }) {
  try {
    const maintenance = await request.json() as any[];
    await env.DB.prepare("DELETE FROM maintenance").run();
    
    if (maintenance.length > 0) {
      const stmt = env.DB.prepare(
        "INSERT INTO maintenance (id, vehicle_number, title, requested_at, status) VALUES (?, ?, ?, ?, ?)"
      );
      const batch = maintenance.map(m => 
        stmt.bind(m.id, m.vehicleNumber, m.title, m.requestedAt, m.status)
      );
      await env.DB.batch(batch);
    }
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 });
  }
}

function mapMaintenance(row: any) {
  return {
    id: row.id,
    vehicleNumber: row.vehicle_number,
    title: row.title,
    requestedAt: row.requested_at,
    status: row.status,
    createdAt: row.created_at
  };
}
