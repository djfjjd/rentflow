import { requireAdminSession, type AdminApiEnv } from "./_auth";
import { ensureStaffDeviceSchema } from "./staff";
import { detectDeviceInfo } from "../../../lib/device-detection";

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
        d.device_name AS current_device_name,
        d.device_alias AS current_device_alias,
        d.device_model AS current_device_model,
        d.os AS current_os,
        d.browser AS current_browser,
        d.status AS device_status
      FROM login_logs ll
      LEFT JOIN devices d ON d.id = ll.device_id OR d.device_id = ll.device_id
      LEFT JOIN users u ON u.id = d.user_id OR lower(u.email) = lower(ll.email)
      ORDER BY ll.created_at DESC
      LIMIT 200
    `).all();
    return Response.json((results || []).map(mapLoginLog));
  } catch (error) {
    console.error("login log api failed", { error: error instanceof Error ? error.message : String(error) });
    return Response.json({ error: String(error) }, { status: 500 });
  }
};

function mapLoginLog(row: any) {
  const detected = detectDeviceInfo({ userAgent: row.user_agent || "" });
  const deviceName = row.current_device_name || row.current_device_alias || row.device_name || row.device_alias || detected.deviceName || "";
  const deviceModel = row.current_device_model || row.device_model || detected.deviceModel || "";
  return {
    id: row.id,
    email: row.email || "",
    loginId: row.login_id || "",
    role: row.role || "",
    deviceId: row.device_id || "",
    userName: row.user_name || "",
    position: loginPosition(row),
    deviceAlias: deviceName,
    deviceModel,
    os: row.current_os || row.os || detected.os || "",
    browser: row.current_browser || row.browser || detected.browser || "",
    ip: row.ip || "",
    userAgent: row.user_agent || "",
    status: row.status,
    message: row.message || "",
    createdAt: row.created_at,
  };
}

function positionFromRole(role: string) {
  if (role === "super_admin") return "관리자";
  if (role === "manager") return "실장님";
  if (role === "staff") return "직원";
  return "";
}

function loginPosition(row: any) {
  const emailPrefix = String(row.email || "").split("@")[0].toLowerCase();
  if (emailPrefix === "djfjjd" || String(row.message || "").toLowerCase().includes("developer")) return "개발자";
  return row.user_position || positionFromRole(row.role);
}
