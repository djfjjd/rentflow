import { ensureColumns, noStoreHeaders, safeNullableText, safeText } from "./_d1-utils";

type Env = {
  DB: any;
};

export async function onRequestGet({ env }: { env: Env }) {
  try {
    await ensureUploadedFilesSchema(env);
    const { results } = await env.DB.prepare(`
      SELECT
        uf.*,
        CASE uf.record_type
          WHEN 'dispatch' THEN d.date
          WHEN 'return' THEN r.date
          WHEN 'accident' THEN ah.date
          WHEN 'maintenance' THEN mh.date
          WHEN 'lost_item' THEN li.date
          WHEN 'reservation' THEN res.date
          ELSE NULL
        END AS business_date,
        CASE uf.record_type
          WHEN 'dispatch' THEN d.time
          WHEN 'return' THEN r.time
          WHEN 'reservation' THEN res.time
          ELSE NULL
        END AS business_time,
        CASE uf.record_type
          WHEN 'dispatch' THEN '배차'
          WHEN 'return' THEN '회차'
          WHEN 'accident' THEN '사고'
          WHEN 'maintenance' THEN '정비'
          WHEN 'lost_item' THEN '분실물'
          WHEN 'reservation' THEN '예약'
          ELSE uf.record_type
        END AS business_kind,
        COALESCE(uf.vehicle_number, d.vehicle_number, r.vehicle_number, ah.vehicle_number, mh.vehicle_number, li.vehicle_number, res.vehicle_number) AS joined_vehicle_number
      FROM uploaded_files uf
      LEFT JOIN dispatches d ON uf.record_type = 'dispatch' AND uf.record_id = d.id
      LEFT JOIN returns r ON uf.record_type = 'return' AND uf.record_id = r.id
      LEFT JOIN accident_histories ah ON uf.record_type = 'accident' AND uf.record_id = ah.id
      LEFT JOIN maintenance_histories mh ON uf.record_type = 'maintenance' AND uf.record_id = mh.id
      LEFT JOIN lost_items li ON uf.record_type = 'lost_item' AND uf.record_id = li.id
      LEFT JOIN reservations res ON uf.record_type = 'reservation' AND uf.record_id = res.id
      ORDER BY COALESCE(business_date, uf.uploaded_at, uf.created_at) DESC, COALESCE(uf.uploaded_at, uf.created_at) DESC
    `).all();
    return Response.json(results.map(mapFile), { headers: noStoreHeaders() });
  } catch (error) {
    console.error("uploaded files list failed", { error: error instanceof Error ? error.message : String(error) });
    return Response.json({ error: String(error) }, { status: 500 });
  }
}

export async function onRequestPost({ request, env }: { request: Request, env: Env }) {
  try {
    await ensureUploadedFilesSchema(env);
    const f = await request.json() as any;
    const result = await env.DB.prepare(
      "INSERT INTO uploaded_files (file_name, r2_url, r2_key, drive_backup_status, drive_file_id, drive_url, drive_folder_id, drive_folder_url, vehicle_number, insurance_number, customer_name, intake_type, file_type, record_type, record_id, vehicle_folder_url, insurance_folder_url, customer_folder_url, uploaded_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(
      safeText(f.fileName),
      safeText(f.r2Url),
      safeText(f.r2Key),
      safeText(f.driveBackupStatus || "none"),
      safeNullableText(f.driveFileId),
      safeNullableText(f.driveUrl),
      safeNullableText(f.driveFolderId),
      safeNullableText(f.driveFolderUrl),
      safeNullableText(f.vehicleNumber),
      safeNullableText(f.insuranceNumber),
      safeNullableText(f.customerName),
      safeNullableText(f.intakeType),
      safeNullableText(f.fileType),
      safeNullableText(f.recordType),
      safeNullableText(f.recordId),
      safeNullableText(f.vehicleFolderUrl),
      safeNullableText(f.insuranceFolderUrl),
      safeNullableText(f.customerFolderUrl),
      safeText(f.uploadedAt || new Date().toISOString())
    ).run();

    return Response.json({ ok: true, success: true, id: result.meta?.last_row_id ?? null }, { headers: noStoreHeaders() });
  } catch (error) {
    console.error("uploaded file save failed", { error: error instanceof Error ? error.message : String(error) });
    return Response.json({ error: String(error) }, { status: 500 });
  }
}

function mapFile(row: any) {
  return {
    id: row.id,
    fileName: row.file_name,
    file_name: row.file_name,
    r2Url: row.r2_url,
    r2_url: row.r2_url,
    r2Key: row.r2_key,
    r2_key: row.r2_key,
    driveBackupStatus: row.drive_backup_status,
    driveFileId: row.drive_file_id,
    driveUrl: row.drive_url,
    drive_url: row.drive_url,
    driveFolderId: row.drive_folder_id,
    driveFolderUrl: row.drive_folder_url,
    mimeType: row.mime_type || row.file_type,
    mime_type: row.mime_type || row.file_type,
    vehicleNumber: row.joined_vehicle_number || row.vehicle_number,
    vehicle_number: row.joined_vehicle_number || row.vehicle_number,
    insuranceNumber: row.insurance_number,
    customerName: row.customer_name,
    intakeType: row.intake_type,
    fileType: row.file_type,
    recordType: row.record_type,
    record_type: row.record_type,
    recordId: row.record_id,
    record_id: row.record_id,
    businessDate: row.business_date,
    businessTime: row.business_time,
    businessKind: row.business_kind,
    vehicleFolderUrl: row.vehicle_folder_url,
    insuranceFolderUrl: row.insurance_folder_url,
    customerFolderUrl: row.customer_folder_url,
    uploadedAt: row.uploaded_at,
    uploaded_at: row.uploaded_at,
    createdAt: row.created_at,
    created_at: row.created_at
  };
}

async function ensureUploadedFilesSchema(env: Env) {
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS dispatches (id TEXT PRIMARY KEY, date TEXT, time TEXT, vehicle_number TEXT)").run();
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS returns (id TEXT PRIMARY KEY, date TEXT, time TEXT, vehicle_number TEXT)").run();
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS accident_histories (id TEXT PRIMARY KEY, date TEXT, vehicle_number TEXT)").run();
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS maintenance_histories (id TEXT PRIMARY KEY, date TEXT, vehicle_number TEXT)").run();
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS lost_items (id TEXT PRIMARY KEY, date TEXT, vehicle_number TEXT)").run();
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS reservations (id TEXT PRIMARY KEY, date TEXT, time TEXT, vehicle_number TEXT)").run();
  await ensureColumns(env.DB, "dispatches", [
    { name: "date", definition: "TEXT" },
    { name: "time", definition: "TEXT" },
    { name: "vehicle_number", definition: "TEXT" },
  ]);
  await ensureColumns(env.DB, "returns", [
    { name: "date", definition: "TEXT" },
    { name: "time", definition: "TEXT" },
    { name: "vehicle_number", definition: "TEXT" },
  ]);
  await ensureColumns(env.DB, "accident_histories", [
    { name: "date", definition: "TEXT" },
    { name: "vehicle_number", definition: "TEXT" },
  ]);
  await ensureColumns(env.DB, "maintenance_histories", [
    { name: "date", definition: "TEXT" },
    { name: "vehicle_number", definition: "TEXT" },
  ]);
  await ensureColumns(env.DB, "lost_items", [
    { name: "date", definition: "TEXT" },
    { name: "vehicle_number", definition: "TEXT" },
  ]);
  await ensureColumns(env.DB, "reservations", [
    { name: "date", definition: "TEXT" },
    { name: "time", definition: "TEXT" },
    { name: "vehicle_number", definition: "TEXT" },
  ]);
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS uploaded_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_name TEXT NOT NULL,
      r2_url TEXT NOT NULL,
      r2_key TEXT NOT NULL,
      drive_backup_status TEXT,
      drive_file_id TEXT,
      drive_url TEXT,
      drive_folder_id TEXT,
      drive_folder_url TEXT,
      vehicle_number TEXT,
      insurance_number TEXT,
      customer_name TEXT,
      intake_type TEXT,
      file_type TEXT,
      record_type TEXT,
      record_id TEXT,
      vehicle_folder_url TEXT,
      insurance_folder_url TEXT,
      customer_folder_url TEXT,
      uploaded_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
  await ensureColumns(env.DB, "uploaded_files", [
    { name: "vehicle_number", definition: "TEXT" },
    { name: "file_type", definition: "TEXT" },
    { name: "mime_type", definition: "TEXT" },
    { name: "record_type", definition: "TEXT" },
    { name: "record_id", definition: "TEXT" },
  ]);
}
