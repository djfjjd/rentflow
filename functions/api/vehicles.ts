import { vehicles as seedVehicles } from "../../lib/erp-data";
import { ensureColumns, safeBindValues, safeNullableText, safeNumber, safeText } from "./_d1-utils";
import { auditColumns, getAuditActor, mapAuditFields } from "./_audit";
import { getApiSession } from "./_permissions";

type Env = {
  DB: any;
  JWT_SECRET?: string;
};

export async function onRequestGet({ env }: { env: Env }) {
  try {
    await ensureVehicleSchema(env);
    const { results } = await env.DB.prepare("SELECT * FROM vehicles ORDER BY sort_order ASC").all();
    
    // Seed if empty
    if (results.length === 0) {
      const stmt = env.DB.prepare(
        "INSERT INTO vehicles (id, plate_number, model, fuel_type, fuel_level, mileage, location, status, sort_order, memo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      );
      
      const batch = seedVehicles.map((v, index) => 
        stmt.bind(...safeBindValues([v.id, v.plateNumber, v.model, v.fuelType, v.fuelLevel, v.mileage, v.location, v.status, index, v.memo]))
      );
      
      await env.DB.batch(batch);
      
      const { results: seededResults } = await env.DB.prepare("SELECT * FROM vehicles ORDER BY sort_order ASC").all();
      return Response.json(seededResults.map(mapVehicle));
    }

    return Response.json(results.map(mapVehicle));
  } catch (error) {
    console.error("vehicle list failed", { error: error instanceof Error ? error.message : String(error) });
    return Response.json({ error: String(error) }, { status: 500 });
  }
}

export async function onRequestPost({ request, env }: { request: Request, env: Env }) {
  try {
    await ensureVehicleSchema(env);
    const vehicle = await request.json() as any;
    
    // Get max sort_order
    const maxSortOrder = await env.DB.prepare("SELECT MAX(sort_order) as maxOrder FROM vehicles").first("maxOrder") || 0;
    const actor = await getAuditActor(env.DB, await getApiSession(request, env));
    
    await env.DB.prepare(
      "INSERT INTO vehicles (id, plate_number, model, color, fuel_type, fuel_level, fuel_display, mileage, purchase_date, company_type, location, status, sort_order, memo, registration_file_url, registration_drive_file_id, registration_file_name, registration_uploaded_at, created_by_id, created_by_name, created_by_role, updated_by_id, updated_by_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(
      safeText(vehicle.id),
      safeText(vehicle.plateNumber),
      safeText(vehicle.model),
      safeNullableText(vehicle.color),
      safeText(vehicle.fuelType),
      safeNumber(vehicle.fuelLevel) || 0,
      safeNullableText(vehicle.fuelDisplay),
      safeNumber(vehicle.mileage) || 0,
      safeNullableText(vehicle.purchaseDate),
      safeNullableText(vehicle.companyType ?? vehicle.company_type),
      safeText(vehicle.location || "본사 주차장"),
      safeText(vehicle.status || "대기중"),
      safeNumber(vehicle.sortOrder) ?? (Number(maxSortOrder) + 1),
      safeText(vehicle.memo),
      safeNullableText(vehicle.registrationFileUrl ?? vehicle.registration_file_url),
      safeNullableText(vehicle.registrationDriveFileId ?? vehicle.registration_drive_file_id),
      safeNullableText(vehicle.registrationFileName ?? vehicle.registration_file_name),
      safeNullableText(vehicle.registrationUploadedAt ?? vehicle.registration_uploaded_at),
      actor.id,
      actor.name,
      actor.role,
      actor.id,
      actor.name
    ).run();

    return Response.json({ success: true });
  } catch (error) {
    console.error("vehicle save failed", { error: error instanceof Error ? error.message : String(error) });
    return Response.json({ error: String(error) }, { status: 500 });
  }
}

export async function onRequestPatch({ request, env }: { request: Request, env: Env }) {
  try {
    await ensureVehicleSchema(env);
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    const plateNumber = url.searchParams.get("plateNumber");
    if (!id && !plateNumber) return Response.json({ error: "id or plateNumber is required" }, { status: 400 });

    const updates = await request.json() as any;
    
    // Construct dynamic update query
    const fields = [];
    const values = [];
    
    if (updates.plateNumber !== undefined) { fields.push("plate_number = ?"); values.push(safeText(updates.plateNumber)); }
    if (updates.model !== undefined) { fields.push("model = ?"); values.push(safeText(updates.model)); }
    if (updates.color !== undefined) { fields.push("color = ?"); values.push(safeText(updates.color)); }
    if (updates.fuelType !== undefined) { fields.push("fuel_type = ?"); values.push(safeText(updates.fuelType)); }
    if (updates.fuelLevel !== undefined) { fields.push("fuel_level = ?"); values.push(safeNumber(updates.fuelLevel) || 0); }
    if (updates.fuelDisplay !== undefined) { fields.push("fuel_display = ?"); values.push(safeNullableText(updates.fuelDisplay)); }
    if (updates.mileage !== undefined) { fields.push("mileage = ?"); values.push(safeNumber(updates.mileage) || 0); }
    if (updates.purchaseDate !== undefined) { fields.push("purchase_date = ?"); values.push(safeNullableText(updates.purchaseDate)); }
    if (updates.companyType !== undefined || updates.company_type !== undefined) { fields.push("company_type = ?"); values.push(safeNullableText(updates.companyType ?? updates.company_type)); }
    if (updates.location !== undefined) { fields.push("location = ?"); values.push(safeText(updates.location)); }
    if (updates.status !== undefined) { fields.push("status = ?"); values.push(safeText(updates.status)); }
    if (updates.damageVehicle !== undefined) { fields.push("damage_vehicle = ?"); values.push(safeText(updates.damageVehicle)); }
    if (updates.activeSummary !== undefined) { fields.push("active_summary = ?"); values.push(safeText(updates.activeSummary)); }
    if (updates.sortOrder !== undefined) { fields.push("sort_order = ?"); values.push(safeNumber(updates.sortOrder) || 0); }
    if (updates.memo !== undefined) { fields.push("memo = ?"); values.push(safeText(updates.memo)); }
    if (updates.registrationFileUrl !== undefined || updates.registration_file_url !== undefined) { fields.push("registration_file_url = ?"); values.push(safeNullableText(updates.registrationFileUrl ?? updates.registration_file_url)); }
    if (updates.registrationDriveFileId !== undefined || updates.registration_drive_file_id !== undefined) { fields.push("registration_drive_file_id = ?"); values.push(safeNullableText(updates.registrationDriveFileId ?? updates.registration_drive_file_id)); }
    if (updates.registrationFileName !== undefined || updates.registration_file_name !== undefined) { fields.push("registration_file_name = ?"); values.push(safeNullableText(updates.registrationFileName ?? updates.registration_file_name)); }
    if (updates.registrationUploadedAt !== undefined || updates.registration_uploaded_at !== undefined) { fields.push("registration_uploaded_at = ?"); values.push(safeNullableText(updates.registrationUploadedAt ?? updates.registration_uploaded_at)); }
    
    if (fields.length === 0) return Response.json({ success: true });
    
    const actor = await getAuditActor(env.DB, await getApiSession(request, env));
    fields.push("updated_by_id = ?", "updated_by_name = ?");
    values.push(actor.id, actor.name);
    fields.push("updated_at = CURRENT_TIMESTAMP");
    values.push(safeText(id || plateNumber));
    
    await env.DB.prepare(
      `UPDATE vehicles SET ${fields.join(", ")} WHERE ${id ? "id" : "plate_number"} = ?`
    ).bind(...safeBindValues(values)).run();

    return Response.json({ success: true });
  } catch (error) {
    console.error("vehicle update failed", { error: error instanceof Error ? error.message : String(error) });
    return Response.json({ error: String(error) }, { status: 500 });
  }
}

export async function onRequestDelete({ request, env }: { request: Request, env: Env }) {
  try {
    await ensureVehicleSchema(env);
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) return Response.json({ error: "id is required" }, { status: 400 });

    await env.DB.prepare("DELETE FROM vehicles WHERE id = ?").bind(safeText(id)).run();
    return Response.json({ success: true });
  } catch (error) {
    console.error("vehicle delete failed", { error: error instanceof Error ? error.message : String(error) });
    return Response.json({ error: String(error) }, { status: 500 });
  }
}

function mapVehicle(row: any) {
  return {
    id: row.id,
    plateNumber: row.plate_number,
    model: row.model,
    color: row.color,
    fuelType: row.fuel_type,
    fuelLevel: row.fuel_level,
    fuelDisplay: row.fuel_display,
    mileage: row.mileage,
    purchaseDate: row.purchase_date,
    companyType: row.company_type,
    company_type: row.company_type,
    location: row.location,
    status: row.status,
    damageVehicle: row.damage_vehicle,
    activeSummary: row.active_summary,
    sortOrder: row.sort_order,
    memo: row.memo,
    registrationFileUrl: row.registration_file_url,
    registration_file_url: row.registration_file_url,
    registrationDriveFileId: row.registration_drive_file_id,
    registration_drive_file_id: row.registration_drive_file_id,
    registrationFileName: row.registration_file_name,
    registration_file_name: row.registration_file_name,
    registrationUploadedAt: row.registration_uploaded_at,
    registration_uploaded_at: row.registration_uploaded_at,
    createdAt: row.created_at,
    ...mapAuditFields(row)
  };
}

async function ensureVehicleSchema(env: Env) {
  await ensureColumns(env.DB, "vehicles", [
    { name: "color", definition: "TEXT" },
    { name: "fuel_display", definition: "TEXT" },
    { name: "purchase_date", definition: "TEXT" },
    { name: "company_type", definition: "TEXT" },
    { name: "damage_vehicle", definition: "TEXT" },
    { name: "active_summary", definition: "TEXT" },
    { name: "registration_file_url", definition: "TEXT" },
    { name: "registration_drive_file_id", definition: "TEXT" },
    { name: "registration_file_name", definition: "TEXT" },
    { name: "registration_uploaded_at", definition: "TEXT" },
    ...auditColumns(),
  ]);
}
