import { noStoreHeaders, safeText } from "../../_d1-utils";
import { ensureArchiveSchema, type Env } from "../../drive/archive";

export async function onRequestPost({ params, env }: { params: { jobId: string }; env: Env }) {
  const jobId = safeText(params.jobId);
  try {
    if (!env.DB) return Response.json({ error: "DB is not configured" }, { status: 500, headers: noStoreHeaders() });
    await ensureArchiveSchema(env);
    const now = new Date().toISOString();
    await env.DB.prepare(`
      UPDATE drive_upload_job_items
      SET status = 'cancelled', result_message = '업로드 중지됨', processed_at = ?
      WHERE job_id = ? AND status = 'pending'
    `).bind(now, jobId).run();
    await env.DB.prepare(`
      UPDATE drive_upload_jobs
      SET status = 'cancelled',
          processed_count = (
            SELECT COUNT(*) FROM drive_upload_job_items
            WHERE job_id = ? AND status IN ('uploaded', 'skipped', 'failed', 'cancelled')
          ),
          uploaded_count = (SELECT COUNT(*) FROM drive_upload_job_items WHERE job_id = ? AND status = 'uploaded'),
          skipped_count = (SELECT COUNT(*) FROM drive_upload_job_items WHERE job_id = ? AND status = 'skipped'),
          failed_count = (SELECT COUNT(*) FROM drive_upload_job_items WHERE job_id = ? AND status = 'failed'),
          cancelled_count = (SELECT COUNT(*) FROM drive_upload_job_items WHERE job_id = ? AND status = 'cancelled'),
          completed_at = ?,
          updated_at = ?
      WHERE id = ?
    `).bind(jobId, jobId, jobId, jobId, jobId, now, now, jobId).run();
    return Response.json({ ok: true, ...(await summarize(env, jobId)) }, { headers: noStoreHeaders() });
  } catch (error) {
    console.error("drive upload job cancel failed", { jobId, error: error instanceof Error ? error.message : String(error) });
    return Response.json({ error: String(error) }, { status: 500, headers: noStoreHeaders() });
  }
}

async function summarize(env: Env, jobId: string) {
  const job = await env.DB.prepare("SELECT * FROM drive_upload_jobs WHERE id = ?").bind(jobId).first() as Record<string, unknown> | null;
  return {
    id: jobId,
    status: safeText(job?.status),
    totalCount: Number(job?.total_count || 0),
    processedCount: Number(job?.processed_count || 0),
    uploadedCount: Number(job?.uploaded_count || 0),
    skippedCount: Number(job?.skipped_count || 0),
    failedCount: Number(job?.failed_count || 0),
    cancelledCount: Number(job?.cancelled_count || 0),
  };
}
