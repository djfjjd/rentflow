import { ensureColumns, noStoreHeaders, safeBindValues, safeBoolInt, safeNullableText, safeText } from "./_d1-utils";
import { requirePermission } from "./_permissions";

type Env = {
  DB: any;
  JWT_SECRET?: string;
};

export async function onRequestGet({ env }: { env: Env }) {
  try {
    await ensureLostItemsSchema(env);
    const { results } = await env.DB.prepare("SELECT * FROM lost_items ORDER BY created_at DESC").all();
    return Response.json(results.map(mapLostItem), { headers: noStoreHeaders() });
  } catch (error) {
    console.error("lost item list failed", { error: error instanceof Error ? error.message : String(error) });
    return Response.json({ error: String(error) }, { status: 500 });
  }
}

export async function onRequestPatch({ request, env }: { request: Request; env: Env }) {
  try {
    const auth = await requirePermission(request, env, "lost_items.update");
    if (auth.response) return auth.response;
    await ensureLostItemsSchema(env);
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return Response.json({ error: "id is required" }, { status: 400 });
    const updates = await request.json() as any;
    const fields = [];
    const values = [];
    if (updates.isCompleted !== undefined || updates.isResolved !== undefined || updates.completed !== undefined || updates.resolved !== undefined) {
      const isResolved = safeBoolInt(updates.isResolved ?? updates.isCompleted ?? updates.resolved ?? updates.completed);
      fields.push("is_completed = ?", "is_resolved = ?");
      values.push(isResolved, isResolved);
      fields.push("resolved_at = ?");
      values.push(isResolved ? safeNullableText(updates.resolvedAt || new Date().toISOString()) : null);
    }
    if (updates.vehicleNumber !== undefined) { fields.push("vehicle_number = ?"); values.push(safeNullableText(updates.vehicleNumber)); }
    if (updates.customerName !== undefined) { fields.push("customer_name = ?"); values.push(safeNullableText(updates.customerName)); }
    if (updates.customerPhone !== undefined || updates.customer_phone !== undefined || updates.phone !== undefined) { fields.push("customer_phone = ?"); values.push(safeNullableText(updates.customerPhone ?? updates.customer_phone ?? updates.phone)); }
    if (updates.sourceDispatchId !== undefined || updates.source_dispatch_id !== undefined) { fields.push("source_dispatch_id = ?"); values.push(safeNullableText(updates.sourceDispatchId ?? updates.source_dispatch_id)); }
    if (updates.memo !== undefined) { fields.push("memo = ?"); values.push(safeNullableText(updates.memo)); }
    if (updates.date !== undefined || updates.foundDate !== undefined) { fields.push("date = ?", "found_date = ?"); values.push(safeNullableText(updates.date ?? updates.foundDate), safeNullableText(updates.date ?? updates.foundDate)); }
    if (updates.status !== undefined) { fields.push("status = ?"); values.push(safeText(updates.status)); }
    if (fields.length === 0) return Response.json({ success: true }, { headers: noStoreHeaders() });
    values.push(id);
    await env.DB.prepare(`UPDATE lost_items SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(...safeBindValues(values)).run();
    return Response.json({ ok: true, success: true, id: safeText(id) }, { headers: noStoreHeaders() });
  } catch (error) {
    console.error("lost item update failed", { error: error instanceof Error ? error.message : String(error) });
    return Response.json({ error: String(error) }, { status: 500 });
  }
}

export async function onRequestPost({ request, env }: { request: Request; env: Env }) {
  try {
    const auth = await requirePermission(request, env, "lost_items.create");
    if (auth.response) return auth.response;
    await ensureLostItemsSchema(env);
    const item = await request.json() as any;
    const date = item.date ?? item.foundDate;
    const isResolved = safeBoolInt(item.isResolved ?? item.isCompleted);
    await env.DB.prepare(
      "INSERT INTO lost_items (id, date, vehicle_number, item_name, customer_name, customer_phone, source_dispatch_id, found_date, found_location, storage_location, memo, status, is_completed, is_resolved, resolved_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)",
    ).bind(
      safeText(item.id),
      safeNullableText(date),
      safeNullableText(item.vehicleNumber),
      safeText(item.itemName || "분실물"),
      safeNullableText(item.customerName),
      safeNullableText(item.customerPhone ?? item.customer_phone ?? item.phone),
      safeNullableText(item.sourceDispatchId ?? item.source_dispatch_id),
      safeNullableText(date),
      safeNullableText(item.foundLocation),
      safeNullableText(item.storageLocation),
      safeNullableText(item.memo),
      safeText(item.status || "보관중"),
      isResolved,
      isResolved,
      isResolved ? safeNullableText(item.resolvedAt || new Date().toISOString()) : null,
    ).run();
    console.log("saved lost item id", item.id);
    return Response.json({ ok: true, success: true, id: safeText(item.id) }, { headers: noStoreHeaders() });
  } catch (error) {
    console.error("lost item save failed", { error: error instanceof Error ? error.message : String(error) });
    return Response.json({ error: String(error) }, { status: 500 });
  }
}

function mapLostItem(row: any) {
  return {
    id: row.id,
    vehicleNumber: row.vehicle_number,
    itemName: row.item_name,
    customerName: row.customer_name,
    customerPhone: row.customer_phone || row.phone,
    sourceDispatchId: row.source_dispatch_id,
    source_dispatch_id: row.source_dispatch_id,
    date: row.date || row.found_date,
    foundDate: row.date || row.found_date,
    foundLocation: row.found_location,
    storageLocation: row.storage_location,
    photoUrl: row.photo_url,
    memo: row.memo,
    status: row.status,
    isResolved: Boolean(row.is_resolved ?? row.is_completed),
    isCompleted: Boolean(row.is_resolved ?? row.is_completed),
    resolvedAt: row.resolved_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function ensureLostItemsSchema(env: Env) {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS lost_items (
      id TEXT PRIMARY KEY,
      date TEXT,
      vehicle_number TEXT,
      customer_name TEXT,
      memo TEXT,
      is_resolved INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
  await ensureColumns(env.DB, "lost_items", [
    { name: "date", definition: "TEXT" },
    { name: "vehicle_number", definition: "TEXT" },
    { name: "item_name", definition: "TEXT" },
    { name: "customer_name", definition: "TEXT" },
    { name: "customer_phone", definition: "TEXT" },
    { name: "source_dispatch_id", definition: "TEXT" },
    { name: "phone", definition: "TEXT" },
    { name: "found_date", definition: "TEXT" },
    { name: "found_location", definition: "TEXT" },
    { name: "storage_location", definition: "TEXT" },
    { name: "memo", definition: "TEXT" },
    { name: "status", definition: "TEXT" },
    { name: "is_completed", definition: "INTEGER DEFAULT 0" },
    { name: "is_resolved", definition: "INTEGER DEFAULT 0" },
    { name: "resolved_at", definition: "DATETIME" },
    { name: "photo_url", definition: "TEXT" },
    { name: "updated_at", definition: "DATETIME" },
  ]);
}
