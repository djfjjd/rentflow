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
    const db = getDb(env);
    await ensureRepairShopSchema(db);
    const { results } = await db.prepare(
      "SELECT * FROM repair_shops ORDER BY created_at DESC, id DESC"
    ).all();
    return Response.json((results || []).map(mapRepairShop), { headers: noStoreHeaders() });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("repair shops list failed", { message });
    return Response.json({ error: message }, { status: 500, headers: noStoreHeaders() });
  }
}

export async function onRequestPost({ request, env }: { request: Request; env: Env }) {
  try {
    const db = getDb(env);
    await ensureRepairShopSchema(db);
    const body = await request.json() as { shops?: RepairShopPayload[]; geocode?: boolean };
    const shops = Array.isArray(body.shops) ? body.shops : [];
    const shouldGeocode = body.geocode !== false;
    const saved = [];
    const skipped = [];
    const failedGeocode = [];

    for (const item of shops) {
      const name = safeText(item.name).trim();
      const address = safeText(item.address).trim();
      if (!name || !address) continue;

      const existing = await db.prepare(
        "SELECT id FROM repair_shops WHERE name = ? AND address = ? LIMIT 1"
      ).bind(name, address).first();
      if (existing) {
        skipped.push({ name, address, reason: "duplicate" });
        continue;
      }

      let lat: number | null = null;
      let lng: number | null = null;
      if (shouldGeocode) {
        const geocoded = await geocodeAddress(address);
        if (geocoded) {
          lat = geocoded.lat;
          lng = geocoded.lng;
        } else {
          failedGeocode.push({ name, address });
        }
      }

      const result = await db.prepare(
        "INSERT INTO repair_shops (name, address, lat, lng) VALUES (?, ?, ?, ?)"
      ).bind(name, address, lat, lng).run();
      saved.push({ id: result.meta?.last_row_id ?? null, name, address, lat, lng });
    }

    return Response.json({ ok: true, saved, skipped, failedGeocode }, { headers: noStoreHeaders() });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("repair shops import failed", { message });
    return Response.json({ error: message }, { status: 500, headers: noStoreHeaders() });
  }
}

export async function onRequestDelete({ request, env }: { request: Request; env: Env }) {
  try {
    const db = getDb(env);
    await ensureRepairShopSchema(db);
    const url = new URL(request.url);
    const id = safeText(url.searchParams.get("id")).trim();
    if (!id) return Response.json({ error: "id is required" }, { status: 400, headers: noStoreHeaders() });

    await db.prepare("DELETE FROM repair_shops WHERE id = ?").bind(id).run();
    return Response.json({ ok: true, id }, { headers: noStoreHeaders() });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("repair shop delete failed", { message });
    return Response.json({ error: message }, { status: 500, headers: noStoreHeaders() });
  }
}

export async function onRequestPut({ request, env }: { request: Request; env: Env }) {
  try {
    const db = getDb(env);
    await ensureRepairShopSchema(db);
    const url = new URL(request.url);
    const id = safeText(url.searchParams.get("id")).trim();
    if (!id) return Response.json({ error: "id is required" }, { status: 400, headers: noStoreHeaders() });

    const body = await request.json() as RepairShopPayload;
    const name = safeText(body.name).trim();
    const address = safeText(body.address).trim();
    if (!name || !address) return Response.json({ error: "name and address are required" }, { status: 400, headers: noStoreHeaders() });

    const current = await db.prepare("SELECT address, lat, lng FROM repair_shops WHERE id = ?").bind(id).first();
    if (!current) return Response.json({ error: "repair shop not found" }, { status: 404, headers: noStoreHeaders() });
    const addressChanged = safeText(current.address).trim() !== address;

    await db.prepare(
      `UPDATE repair_shops
       SET name = ?, address = ?, lat = ?, lng = ?
       WHERE id = ?`
    ).bind(name, address, addressChanged ? null : current.lat ?? null, addressChanged ? null : current.lng ?? null, id).run();

    return Response.json({ ok: true, id, name, address }, { headers: noStoreHeaders() });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("repair shop update failed", { message });
    return Response.json({ error: message }, { status: 500, headers: noStoreHeaders() });
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

function getDb(env: Env) {
  if (!env?.DB) {
    throw new Error("D1 binding DB is not configured. Check wrangler.toml [[d1_databases]] binding = \"DB\".");
  }
  return env.DB;
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
