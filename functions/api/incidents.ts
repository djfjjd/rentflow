import { ensureColumns, noStoreHeaders, safeBoolInt, safeNullableText, safeText } from "./_d1-utils";
import { auditColumns, getAuditActor, mapAuditFields } from "./_audit";
import { requirePermission } from "./_permissions";

type Env = {
  DB: any;
  JWT_SECRET?: string;
};

export async function onRequestGet({ env }: { env: Env }) {
  try {
    await ensureIncidentSchemas(env);
    const [accidents, maintenance] = await Promise.all([
      env.DB.prepare("SELECT * FROM accident_histories ORDER BY created_at DESC").all(),
      env.DB.prepare("SELECT * FROM maintenance_histories ORDER BY created_at DESC").all(),
    ]);
    return Response.json({
      accidents: (accidents.results || []).map((row: any) => ({ ...row, ...mapAuditFields(row), createdAt: row.created_at, type: "accident" })),
      maintenance: (maintenance.results || []).map((row: any) => ({ ...row, ...mapAuditFields(row), createdAt: row.created_at, type: "maintenance" })),
    }, { headers: noStoreHeaders() });
  } catch (error) {
    console.error("incident list failed", { error: error instanceof Error ? error.message : String(error) });
    return Response.json({ error: String(error) }, { status: 500 });
  }
}

export async function onRequestPost({ request, env }: { request: Request; env: Env }) {
  try {
    const auth = await requirePermission(request, env, "repair_records.create");
    if (auth.response) return auth.response;
    await ensureIncidentSchemas(env);
    const body = await request.json() as any;
    const kind = safeText(body.type || body.kind || body.incidentType || "accident");
    const id = safeText(body.id);
    const date = safeNullableText(body.date || body.accidentDate || body.foundDate);
    const vehicleNumber = safeText(body.vehicleNumber || body.plateNumber);
    const memo = safeText(body.memo || body.notes || body.description);
    const actor = await getAuditActor(env.DB, auth.session);

    if (kind === "maintenance" || kind === "정비") {
      await env.DB.prepare(
        "INSERT INTO maintenance_histories (id, date, vehicle_number, maintenance_content, memo, is_completed, created_by_id, created_by_name, created_by_role, updated_by_id, updated_by_name, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)"
      ).bind(
        id,
        date,
        vehicleNumber,
        safeText(body.maintenanceContent || body.content || body.title),
        memo,
        safeBoolInt(body.isCompleted),
        actor.id,
        actor.name,
        actor.role,
        actor.id,
        actor.name
      ).run();
      console.log("saved maintenance id", id);
      return Response.json({ ok: true, success: true, id, type: "maintenance" }, { headers: noStoreHeaders() });
    }

    await env.DB.prepare(
      "INSERT INTO accident_histories (id, date, vehicle_number, accident_part, memo, is_completed, created_by_id, created_by_name, created_by_role, updated_by_id, updated_by_name, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)"
    ).bind(
      id,
      date,
      vehicleNumber,
      safeText(body.accidentPart || body.content),
      memo,
      safeBoolInt(body.isCompleted),
      actor.id,
      actor.name,
      actor.role,
      actor.id,
      actor.name
    ).run();
    console.log("saved accident id", id);
    return Response.json({ ok: true, success: true, id, type: "accident" }, { headers: noStoreHeaders() });
  } catch (error) {
    console.error("incident save failed", { error: error instanceof Error ? error.message : String(error) });
    return Response.json({ error: String(error) }, { status: 500 });
  }
}

async function ensureIncidentSchemas(env: Env) {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS accident_histories (
      id TEXT PRIMARY KEY,
      date TEXT,
      vehicle_number TEXT,
      accident_part TEXT,
      memo TEXT,
      is_completed INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS maintenance_histories (
      id TEXT PRIMARY KEY,
      date TEXT,
      vehicle_number TEXT,
      maintenance_content TEXT,
      memo TEXT,
      is_completed INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
  await ensureColumns(env.DB, "accident_histories", [
    { name: "date", definition: "TEXT" },
    { name: "vehicle_number", definition: "TEXT" },
    { name: "accident_part", definition: "TEXT" },
    { name: "memo", definition: "TEXT" },
    { name: "is_completed", definition: "INTEGER DEFAULT 0" },
    { name: "updated_at", definition: "DATETIME" },
    ...auditColumns(),
  ]);
  await ensureColumns(env.DB, "maintenance_histories", [
    { name: "date", definition: "TEXT" },
    { name: "vehicle_number", definition: "TEXT" },
    { name: "maintenance_content", definition: "TEXT" },
    { name: "memo", definition: "TEXT" },
    { name: "is_completed", definition: "INTEGER DEFAULT 0" },
    { name: "updated_at", definition: "DATETIME" },
    ...auditColumns(),
  ]);
}
