import { getPermissionPresetMatrix, savePermissionPresetMatrix } from "../../../lib/permissions";
import { requireAdminSession, type AdminApiEnv } from "./_auth";

export const onRequest: PagesFunction<AdminApiEnv> = async ({ request, env }) => {
  try {
    if (request.method === "GET") {
      const auth = await requireAdminSession(request, env, "read");
      if (auth.response) return auth.response;
      return Response.json({ matrix: await getPermissionPresetMatrix(env.DB) });
    }

    if (request.method === "PUT" || request.method === "POST") {
      const auth = await requireAdminSession(request, env, "write");
      if (auth.response) return auth.response;
      const body = (await request.json().catch(() => ({}))) as { matrix?: unknown };
      return Response.json({ matrix: await savePermissionPresetMatrix(env.DB, body.matrix as never) });
    }

    return Response.json({ error: "Method not allowed." }, { status: 405 });
  } catch (error) {
    console.error("permission presets api failed", { error: error instanceof Error ? error.message : String(error) });
    return Response.json({ error: "권한 저장에 실패했습니다." }, { status: 500 });
  }
};
