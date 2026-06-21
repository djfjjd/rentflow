import { noStoreHeaders, safeText } from "./_d1-utils";
import { ensureArchiveSchema, type Env } from "./drive/archive";

export async function onRequestPost({ request, env }: { request: Request; env: Env }) {
  try {
    if (!env.DB) return Response.json({ error: "DB is not configured" }, { status: 500, headers: noStoreHeaders() });
    await ensureArchiveSchema(env);
    const body = await request.json() as { folderIds?: unknown[] };
    const folderIds = Array.isArray(body.folderIds)
      ? [...new Set(body.folderIds.map((id) => safeText(id)).filter(Boolean))]
      : [];
    if (!folderIds.length) {
      return Response.json({ error: "folderIds is required" }, { status: 400, headers: noStoreHeaders() });
    }

    const now = new Date().toISOString();
    const jobId = crypto.randomUUID();
    await env.DB.prepare(`
      INSERT INTO drive_upload_jobs (
        id, status, total_count, processed_count, uploaded_count, skipped_count, failed_count, cancelled_count, created_at, updated_at
      ) VALUES (?, 'pending', ?, 0, 0, 0, 0, 0, ?, ?)
    `).bind(jobId, folderIds.length, now, now).run();

    for (const chunk of chunkArray(folderIds, 50)) {
      const statements = chunk.map((folderId) => env.DB.prepare(`
        INSERT INTO drive_upload_job_items (id, job_id, folder_id, status, created_at)
        VALUES (?, ?, ?, 'pending', ?)
      `).bind(crypto.randomUUID(), jobId, folderId, now));
      await env.DB.batch(statements);
    }

    return Response.json({ ok: true, jobId }, { headers: noStoreHeaders() });
  } catch (error) {
    console.error("drive upload job create failed", { error: error instanceof Error ? error.message : String(error) });
    return Response.json({ error: String(error) }, { status: 500, headers: noStoreHeaders() });
  }
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}
