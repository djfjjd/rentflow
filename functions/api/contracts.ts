import { ensureColumns, noStoreHeaders, safeNullableText, safeText } from "./_d1-utils";

type Env = {
  DB: any;
};

export async function onRequestGet({ request, env }: { request: Request; env: Env }) {
  try {
    await ensureContractsSchema(env);
    const url = new URL(request.url);
    const recordId = safeText(url.searchParams.get("recordId"));
    const recordType = safeText(url.searchParams.get("recordType") || "dispatchContract");
    const params: string[] = [];
    const where: string[] = [];

    if (recordType) {
      where.push("record_type = ?");
      params.push(recordType);
    }
    if (recordId) {
      where.push("record_id = ?");
      params.push(recordId);
    }

    const query = `
      SELECT *
      FROM contracts
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY uploaded_at DESC, updated_at DESC, created_at DESC
    `;
    const { results } = await env.DB.prepare(query).bind(...params).all();
    return Response.json((results || []).map(mapContract), { headers: noStoreHeaders() });
  } catch (error) {
    console.error("contracts list failed", { error: error instanceof Error ? error.message : String(error) });
    return Response.json({ error: String(error) }, { status: 500, headers: noStoreHeaders() });
  }
}

export async function onRequestPost({ request, env }: { request: Request; env: Env }) {
  try {
    await ensureContractsSchema(env);
    const body = await request.json() as any;
    const recordId = safeText(body.recordId);
    const recordType = safeText(body.recordType || "dispatchContract");
    if (!recordId || !recordType) {
      return Response.json({ error: "recordId and recordType are required" }, { status: 400, headers: noStoreHeaders() });
    }

    const existing = await env.DB.prepare(
      "SELECT id FROM contracts WHERE record_id = ? AND record_type = ? LIMIT 1"
    ).bind(recordId, recordType).first();
    const id = safeText(existing?.id || body.id || `contract_${Date.now()}`);

    if (existing?.id) {
      await env.DB.prepare(`
        UPDATE contracts SET
          vehicle_number = ?,
          file_name = ?,
          file_url = ?,
          document_url = ?,
          drive_file_id = ?,
          uploaded_at = ?,
          uploaded_by = ?,
          memo = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE record_id = ? AND record_type = ?
      `).bind(
        safeNullableText(body.vehicleNumber),
        safeNullableText(body.fileName),
        safeNullableText(body.fileUrl),
        safeNullableText(body.fileUrl || body.documentUrl),
        safeNullableText(body.driveFileId),
        safeText(body.uploadedAt || new Date().toISOString()),
        safeNullableText(body.uploadedBy),
        safeNullableText(body.memo),
        recordId,
        recordType,
      ).run();
    } else {
      await env.DB.prepare(`
        INSERT INTO contracts (
          id,
          record_id,
          record_type,
          dispatch_id,
          vehicle_number,
          file_name,
          file_url,
          document_url,
          drive_file_id,
          uploaded_at,
          uploaded_by,
          memo,
          status,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).bind(
        id,
        recordId,
        recordType,
        safeNullableText(body.dispatchId || recordId),
        safeNullableText(body.vehicleNumber),
        safeNullableText(body.fileName),
        safeNullableText(body.fileUrl),
        safeNullableText(body.fileUrl || body.documentUrl),
        safeNullableText(body.driveFileId),
        safeText(body.uploadedAt || new Date().toISOString()),
        safeNullableText(body.uploadedBy),
        safeNullableText(body.memo),
        safeText(body.status || "등록완료"),
      ).run();
    }

    const saved = await env.DB.prepare("SELECT * FROM contracts WHERE record_id = ? AND record_type = ? LIMIT 1").bind(recordId, recordType).first();
    return Response.json({ success: true, contract: mapContract(saved) }, { headers: noStoreHeaders() });
  } catch (error) {
    console.error("contract save failed", { error: error instanceof Error ? error.message : String(error) });
    return Response.json({ error: String(error) }, { status: 500, headers: noStoreHeaders() });
  }
}

async function ensureContractsSchema(env: Env) {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS contracts (
      id TEXT PRIMARY KEY,
      dispatch_id TEXT,
      title TEXT,
      customer_name TEXT,
      vehicle_number TEXT,
      document_url TEXT,
      status TEXT DEFAULT '작성중',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
  await ensureColumns(env.DB, "contracts", [
    { name: "record_id", definition: "TEXT" },
    { name: "record_type", definition: "TEXT" },
    { name: "vehicle_number", definition: "TEXT" },
    { name: "file_name", definition: "TEXT" },
    { name: "file_url", definition: "TEXT" },
    { name: "drive_file_id", definition: "TEXT" },
    { name: "uploaded_at", definition: "DATETIME" },
    { name: "uploaded_by", definition: "TEXT" },
    { name: "memo", definition: "TEXT" },
    { name: "updated_at", definition: "DATETIME" },
  ]);
}

function mapContract(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    recordId: row.record_id || row.dispatch_id,
    record_id: row.record_id || row.dispatch_id,
    recordType: row.record_type || "dispatchContract",
    record_type: row.record_type || "dispatchContract",
    dispatchId: row.dispatch_id,
    vehicleNumber: row.vehicle_number,
    vehicle_number: row.vehicle_number,
    fileName: row.file_name || row.title,
    file_name: row.file_name || row.title,
    fileUrl: row.file_url || row.document_url,
    file_url: row.file_url || row.document_url,
    documentUrl: row.document_url,
    document_url: row.document_url,
    driveFileId: row.drive_file_id,
    drive_file_id: row.drive_file_id,
    uploadedAt: row.uploaded_at || row.created_at,
    uploaded_at: row.uploaded_at || row.created_at,
    uploadedBy: row.uploaded_by,
    memo: row.memo,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
