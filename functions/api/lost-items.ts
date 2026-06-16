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

export async function onRequestPost({ request, env }: { request: Request; env: Env }) {
  try {
    const item = await request.json() as any;
    await env.DB.prepare(
      "INSERT INTO lost_items (id, vehicle_number, item_name, found_date, found_location, storage_location, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
    ).bind(
      item.id,
      item.vehicleNumber || null,
      item.itemName,
      item.foundDate || null,
      item.foundLocation || null,
      item.storageLocation || null,
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
    foundDate: row.found_date,
    foundLocation: row.found_location,
    storageLocation: row.storage_location,
    photoUrl: row.photo_url,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
