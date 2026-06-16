import { safeBindValues, safeNullableText, safeNumber, safeText } from "./_d1-utils";

type Env = {
  DB: any;
};

export async function onRequestGet({ env }: { env: Env }) {
  try {
    const { results } = await env.DB.prepare("SELECT * FROM partner_addresses ORDER BY updated_at DESC, name ASC").all();
    return Response.json(results.map(mapPartner));
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 });
  }
}

export async function onRequestPost({ request, env }: { request: Request; env: Env }) {
  try {
    const partner = await request.json() as any;
    await env.DB.prepare(
      "INSERT INTO partner_addresses (id, name, category, manager_name, phone, address, detail_address, naver_map_url, latitude, longitude, memo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    ).bind(
      safeText(partner.id),
      safeText(partner.name),
      safeNullableText(partner.category),
      safeNullableText(partner.managerName),
      safeNullableText(partner.phone),
      safeText(partner.address),
      safeNullableText(partner.detailAddress),
      safeNullableText(partner.naverMapUrl),
      safeNumber(partner.latitude),
      safeNumber(partner.longitude),
      safeNullableText(partner.memo),
    ).run();
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 });
  }
}

export async function onRequestPatch({ request, env }: { request: Request; env: Env }) {
  try {
    const partner = await request.json() as any;
    await env.DB.prepare(
      "UPDATE partner_addresses SET name = ?, category = ?, manager_name = ?, phone = ?, address = ?, detail_address = ?, naver_map_url = ?, latitude = ?, longitude = ?, memo = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    ).bind(
      safeText(partner.name),
      safeNullableText(partner.category),
      safeNullableText(partner.managerName),
      safeNullableText(partner.phone),
      safeText(partner.address),
      safeNullableText(partner.detailAddress),
      safeNullableText(partner.naverMapUrl),
      safeNumber(partner.latitude),
      safeNumber(partner.longitude),
      safeNullableText(partner.memo),
      safeText(partner.id),
    ).run();
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 });
  }
}

export async function onRequestDelete({ request, env }: { request: Request; env: Env }) {
  try {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return Response.json({ error: "id is required" }, { status: 400 });
    await env.DB.prepare("DELETE FROM partner_addresses WHERE id = ?").bind(safeText(id)).run();
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 });
  }
}

function mapPartner(row: any) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    managerName: row.manager_name,
    phone: row.phone,
    address: row.address,
    detailAddress: row.detail_address,
    naverMapUrl: row.naver_map_url,
    latitude: row.latitude,
    longitude: row.longitude,
    memo: row.memo,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
