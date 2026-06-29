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

    const { results } = await env.DB.prepare("SELECT * FROM login_logs ORDER BY created_at DESC LIMIT 200").all();
    return Response.json((results || []).map((row: any) => ({
      id: row.id,
      email: row.email || "",
      loginId: row.login_id || "",
      role: row.role || "",
      deviceId: row.device_id || "",
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
