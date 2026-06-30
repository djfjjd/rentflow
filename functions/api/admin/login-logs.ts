import { requireAdminSession, type AdminApiEnv } from "./_auth";
import { ensureStaffDeviceSchema } from "./staff";

export const onRequest: PagesFunction<AdminApiEnv> = async ({ request, env }) => {
  try {
    await ensureStaffDeviceSchema(env.DB);
    const auth = await requireAdminSession(request, env, "read");
    if (auth.response) return auth.response;

    if (request.method !== "GET") {
      return Response.json({ error: "Method not allowed." }, { status: 405 });
    }

    const { results } = await env.DB.prepare(`
      SELECT
        ll.*,
        u.name AS user_name,
        u.position AS user_position,
        d.device_name,
        d.device_alias,
        d.device_model,
        d.os,
        d.browser,
        d.status AS device_status
      FROM login_logs ll
      LEFT JOIN devices d ON d.id = ll.device_id OR d.device_id = ll.device_id
      LEFT JOIN users u ON u.id = d.user_id OR lower(u.email) = lower(ll.email)
      ORDER BY ll.created_at DESC
      LIMIT 200
    `).all();
    return Response.json((results || []).map((row: any) => ({
      id: row.id,
      email: row.email || "",
      loginId: row.login_id || "",
      role: row.role || "",
      deviceId: row.device_id || "",
      userName: row.user_name || "",
      position: row.user_position || positionFromRole(row.role),
      deviceAlias: row.device_name || row.device_alias || "",
      deviceModel: row.device_model || "",
      os: row.os || "",
      browser: row.browser || "",
      ip: row.ip || "",
      userAgent: row.user_agent || "",
      status: row.status,
      message: row.message || "",
      createdAt: row.created_at,
    })));
  } catch (error) {
    console.error("login log api failed", { error: error instanceof Error ? error.message : String(error) });
    return Response.json({ error: String(error) }, { status: 500 });
  }
};

function positionFromRole(role: string) {
  if (role === "super_admin") return "관리자";
  if (role === "manager") return "실장님";
  if (role === "staff") return "직원";
  return "";
}
