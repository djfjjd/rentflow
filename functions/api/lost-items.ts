type Env = {
  DB: any;
};

export async function onRequestGet({ env }: { env: Env }) {
  try {
    const { results } = await env.DB.prepare("SELECT * FROM lost_items ORDER BY created_at DESC").all();
    return Response.json(results.map(mapLostItem));
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 });
  }
}

export async function onRequestPatch({ request, env }: { request: Request; env: Env }) {
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
    await env.DB.prepare(`UPDATE lost_items SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(...values).run();
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 });
  }
}

export async function onRequestPost({ request, env }: { request: Request; env: Env }) {
  try {
    const item = await request.json() as any;
    await env.DB.prepare(
      "INSERT INTO lost_items (id, vehicle_number, item_name, customer_name, found_date, found_location, storage_location, memo, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    ).bind(
      item.id,
      item.vehicleNumber || null,
      item.itemName || "분실물",
      item.customerName || null,
      item.foundDate || null,
      item.foundLocation || null,
      item.storageLocation || null,
      item.memo || null,
      item.status || "보관중",
    ).run();
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 });
  }
}

function mapLostItem(row: any) {
  return {
    id: row.id,
    vehicleNumber: row.vehicle_number,
    itemName: row.item_name,
    customerName: row.customer_name,
    foundDate: row.found_date,
    foundLocation: row.found_location,
    storageLocation: row.storage_location,
    photoUrl: row.photo_url,
    memo: row.memo,
    status: row.status,
    isCompleted: Boolean(row.is_completed),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
