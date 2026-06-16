import { safeNumber, safeText } from "../_d1-utils";

type Env = {
  DB: any;
};

export async function onRequestPatch({ request, env }: { request: Request, env: Env }) {
  try {
    const { items } = await request.json() as { items: { id: string, sortOrder: number }[] };
    
    if (!items || !Array.isArray(items)) {
      return Response.json({ error: "Invalid items" }, { status: 400 });
    }

    const stmt = env.DB.prepare("UPDATE vehicles SET sort_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
    
    const batch = items.map(item => stmt.bind(safeNumber(item.sortOrder) || 0, safeText(item.id)));
    
    await env.DB.batch(batch);

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 });
  }
}
