import { ensureColumns, noStoreHeaders, safeText } from "./_d1-utils";
import { geocodeAddress } from "../../lib/geocode.js";

type Env = {
  DB: any;
};

type RepairShopPayload = {
  name?: string;
  address?: string;
};

export async function onRequestGet({ env }: { env: Env }) {
  try {
    await ensureRepairShopSchema(env.DB);
    const { results } = await env.DB.prepare(
      "SELECT * FROM repair_shops ORDER BY created_at DESC, id DESC"
    ).all();
    return Response.json((results || []).map(mapRepairShop), { headers: noStoreHeaders() });
  } catch (error) {
    console.error("repair shops list failed", { error: error instanceof Error ? error.message : String(error) });
    return Response.json({ error: String(error) }, { status: 500, headers: noStoreHeaders() });
  }
}

export async function onRequestPost({ request, env }: { request: Request; env: Env }) {
  try {
    await ensureRepairShopSchema(env.DB);
    const body = await request.json() as { shops?: RepairShopPayload[] };
    const shops = Array.isArray(body.shops) ? body.shops : [];
    const saved = [];
    const skipped = [];
    const failedGeocode = [];

    for (const item of shops) {
      const name = safeText(item.name).trim();
      const address = safeText(item.address).trim();
      if (!name || !address) continue;

      const existing = await env.DB.prepare(
        "SELECT id FROM repair_shops WHERE name = ? AND address = ? LIMIT 1"
      ).bind(name, address).first();
      if (existing) {
        skipped.push({ name, address, reason: "duplicate" });
        continue;
      }

      let lat: number | null = null;
      let lng: number | null = null;
      const geocoded = await geocodeAddress(address);
      if (geocoded) {
        lat = geocoded.lat;
        lng = geocoded.lng;
      } else {
        failedGeocode.push({ name, address });
      }

      const result = await env.DB.prepare(
        "INSERT INTO repair_shops (name, address, lat, lng) VALUES (?, ?, ?, ?)"
      ).bind(name, address, lat, lng).run();
      saved.push({ id: result.meta?.last_row_id ?? null, name, address, lat, lng });
    }

    return Response.json({ ok: true, saved, skipped, failedGeocode }, { headers: noStoreHeaders() });
  } catch (error) {
    console.error("repair shops import failed", { error: error instanceof Error ? error.message : String(error) });
    return Response.json({ error: String(error) }, { status: 500, headers: noStoreHeaders() });
  }
}

function mapRepairShop(row: any) {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    lat: row.lat,
    lng: row.lng,
    createdAt: row.created_at,
  };
}

async function ensureRepairShopSchema(db: any) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS repair_shops (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      address TEXT NOT NULL,
      lat REAL,
      lng REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
  await ensureColumns(db, "repair_shops", [
    { name: "name", definition: "TEXT NOT NULL DEFAULT ''" },
    { name: "address", definition: "TEXT NOT NULL DEFAULT ''" },
    { name: "lat", definition: "REAL" },
    { name: "lng", definition: "REAL" },
    { name: "created_at", definition: "DATETIME DEFAULT CURRENT_TIMESTAMP" },
  ]);
}
