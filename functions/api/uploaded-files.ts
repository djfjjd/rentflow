import { safeBindValues, safeNullableText, safeText } from "./_d1-utils";

type Env = {
  DB: any;
};

export async function onRequestGet({ env }: { env: Env }) {
  try {
    const { results } = await env.DB.prepare("SELECT * FROM uploaded_files ORDER BY uploaded_at DESC").all();
    return Response.json(results.map(mapFile));
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 });
  }
}

export async function onRequestPost({ request, env }: { request: Request, env: Env }) {
  try {
    const f = await request.json() as any;
    await env.DB.prepare(
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

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 });
  }
}

function mapFile(row: any) {
  return {
    id: row.id,
    fileName: row.file_name,
    r2Url: row.r2_url,
    r2Key: row.r2_key,
    driveBackupStatus: row.drive_backup_status,
    driveFileId: row.drive_file_id,
    driveUrl: row.drive_url,
    driveFolderId: row.drive_folder_id,
    driveFolderUrl: row.drive_folder_url,
    vehicleNumber: row.vehicle_number,
    insuranceNumber: row.insurance_number,
    customerName: row.customer_name,
    intakeType: row.intake_type,
    fileType: row.file_type,
    recordType: row.record_type,
    recordId: row.record_id,
    vehicleFolderUrl: row.vehicle_folder_url,
    insuranceFolderUrl: row.insurance_folder_url,
    customerFolderUrl: row.customer_folder_url,
    uploadedAt: row.uploaded_at
  };
}
