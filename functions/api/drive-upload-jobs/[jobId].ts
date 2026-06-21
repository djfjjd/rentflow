import { noStoreHeaders, safeText } from "../_d1-utils";
import { ensureArchiveSchema, type Env } from "../drive/archive";

type JobRow = Record<string, unknown>;
type ItemRow = Record<string, unknown>;

export async function onRequestGet({ params, env }: { params: { jobId: string }; env: Env }) {
  try {
    if (!env.DB) return Response.json({ error: "DB is not configured" }, { status: 500, headers: noStoreHeaders() });
    await ensureArchiveSchema(env);
    const jobId = safeText(params.jobId);
    if (jobId === "active") {
      const { results } = await env.DB.prepare(`
        SELECT * FROM drive_upload_jobs
        WHERE status IN ('pending', 'processing')
        ORDER BY created_at DESC
        LIMIT 1
      `).all();
      const active = (results || [])[0] as JobRow | undefined;
      if (!active) return Response.json({ active: null }, { headers: noStoreHeaders() });
      return Response.json({ active: await jobStatus(env, safeText(active.id)) }, { headers: noStoreHeaders() });
    }
    return Response.json(await jobStatus(env, jobId), { headers: noStoreHeaders() });
  } catch (error) {
    console.error("drive upload job status failed", { error: error instanceof Error ? error.message : String(error) });
    return Response.json({ error: String(error) }, { status: 500, headers: noStoreHeaders() });
  }
}

async function jobStatus(env: Env, jobId: string) {
  const job = await env.DB.prepare("SELECT * FROM drive_upload_jobs WHERE id = ?").bind(jobId).first() as JobRow | null;
  if (!job) return { error: "job not found" };
  const { results } = await env.DB.prepare(`
    SELECT id, folder_id, status, result_message, processed_at, created_at
    FROM drive_upload_job_items
    WHERE job_id = ?
    ORDER BY COALESCE(processed_at, created_at) DESC
    LIMIT 20
  `).bind(jobId).all();
  const totalCount = Number(job.total_count || 0);
  const processedCount = Number(job.processed_count || 0);
  return {
    id: safeText(job.id),
    status: safeText(job.status),
    totalCount,
    processedCount,
    uploadedCount: Number(job.uploaded_count || 0),
    skippedCount: Number(job.skipped_count || 0),
    failedCount: Number(job.failed_count || 0),
    cancelledCount: Number(job.cancelled_count || 0),
    percent: totalCount ? Math.round((processedCount / totalCount) * 100) : 0,
    lastError: safeText(job.last_error),
    createdAt: safeText(job.created_at),
    updatedAt: safeText(job.updated_at),
    recentLogs: ((results || []) as ItemRow[]).map((item) => ({
      id: safeText(item.id),
      folderId: safeText(item.folder_id),
      status: safeText(item.status),
      message: safeText(item.result_message),
      processedAt: safeText(item.processed_at),
      createdAt: safeText(item.created_at),
    })),
  };
}
