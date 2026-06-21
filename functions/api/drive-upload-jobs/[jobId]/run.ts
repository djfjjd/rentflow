import webpush from "web-push";
import { noStoreHeaders, safeText } from "../../_d1-utils";
import { ensureArchiveSchema, processDriveArchiveFileIds, type Env } from "../../drive/archive";

type JobRow = Record<string, unknown>;
type ItemRow = Record<string, unknown>;

const BATCH_SIZE = 3;

export async function onRequestPost({ params, env }: { params: { jobId: string }; env: Env & PushEnv }) {
  const jobId = safeText(params.jobId);
  try {
    if (!env.DB || !env.RENTFLOW_UPLOADS) {
      return Response.json({ error: "DB or R2 is not configured" }, { status: 500, headers: noStoreHeaders() });
    }
    await ensureArchiveSchema(env);
    const job = await env.DB.prepare("SELECT * FROM drive_upload_jobs WHERE id = ?").bind(jobId).first() as JobRow | null;
    if (!job) return Response.json({ error: "job not found" }, { status: 404, headers: noStoreHeaders() });
    const status = safeText(job.status);
    if (!["pending", "processing"].includes(status)) {
      return Response.json(await summarizeJob(env, jobId), { headers: noStoreHeaders() });
    }

    const now = new Date().toISOString();
    await env.DB.prepare(`
      UPDATE drive_upload_jobs
      SET status = 'processing', started_at = COALESCE(started_at, ?), updated_at = ?
      WHERE id = ?
    `).bind(now, now, jobId).run();

    const { results } = await env.DB.prepare(`
      SELECT id, folder_id
      FROM drive_upload_job_items
      WHERE job_id = ? AND status = 'pending'
      ORDER BY created_at ASC
      LIMIT ?
    `).bind(jobId, BATCH_SIZE).all();
    const items = (results || []) as ItemRow[];

    if (!items.length) {
      await finalizeJobIfDone(env, jobId);
      const summary = await summarizeJob(env, jobId);
      await sendJobPushIfTerminal(env, summary);
      return Response.json(summary, { headers: noStoreHeaders() });
    }

    for (const item of items) {
      const itemId = safeText(item.id);
      const fileId = Number(item.folder_id);
      await env.DB.prepare("UPDATE drive_upload_job_items SET status = 'processing' WHERE id = ?").bind(itemId).run();
      try {
        const result = await processDriveArchiveFileIds(env, [fileId]);
        const archiveItem = result.results?.[0];
        const itemStatus = archiveItem?.status === "uploaded" ? "uploaded" : archiveItem?.status === "skipped" ? "skipped" : "failed";
        const message = archiveItem?.error || archiveItem?.reason || archiveItem?.fileName || itemStatus;
        await env.DB.prepare(`
          UPDATE drive_upload_job_items
          SET status = ?, result_message = ?, processed_at = ?
          WHERE id = ?
        `).bind(itemStatus, message, new Date().toISOString(), itemId).run();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await env.DB.prepare(`
          UPDATE drive_upload_job_items
          SET status = 'failed', result_message = ?, processed_at = ?
          WHERE id = ?
        `).bind(message, new Date().toISOString(), itemId).run();
      }
    }

    await refreshJobCounts(env, jobId);
    await finalizeJobIfDone(env, jobId);
    const summary = await summarizeJob(env, jobId);
    await sendJobPushIfTerminal(env, summary);
    return Response.json(summary, { headers: noStoreHeaders() });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("drive upload job run failed", { jobId, error: message });
    await env.DB?.prepare(`
      UPDATE drive_upload_jobs
      SET status = 'failed', last_error = ?, completed_at = ?, updated_at = ?
      WHERE id = ?
    `).bind(message, new Date().toISOString(), new Date().toISOString(), jobId).run();
    return Response.json({ error: message }, { status: 500, headers: noStoreHeaders() });
  }
}

async function refreshJobCounts(env: Env, jobId: string) {
  const counts = await countItems(env, jobId);
  await env.DB.prepare(`
    UPDATE drive_upload_jobs
    SET processed_count = ?, uploaded_count = ?, skipped_count = ?, failed_count = ?, cancelled_count = ?, updated_at = ?
    WHERE id = ?
  `).bind(
    counts.processed,
    counts.uploaded,
    counts.skipped,
    counts.failed,
    counts.cancelled,
    new Date().toISOString(),
    jobId,
  ).run();
}

async function finalizeJobIfDone(env: Env, jobId: string) {
  await refreshJobCounts(env, jobId);
  const counts = await countItems(env, jobId);
  if (counts.pending || counts.processing) return;
  const status = counts.failed > 0 ? "completed" : "completed";
  await env.DB.prepare(`
    UPDATE drive_upload_jobs
    SET status = ?, completed_at = COALESCE(completed_at, ?), updated_at = ?
    WHERE id = ? AND status IN ('pending', 'processing')
  `).bind(status, new Date().toISOString(), new Date().toISOString(), jobId).run();
}

async function countItems(env: Env, jobId: string) {
  const { results } = await env.DB.prepare(`
    SELECT status, COUNT(*) AS count
    FROM drive_upload_job_items
    WHERE job_id = ?
    GROUP BY status
  `).bind(jobId).all();
  const counts: Record<string, number> = {};
  for (const row of (results || []) as Record<string, unknown>[]) {
    counts[safeText(row.status)] = Number(row.count || 0);
  }
  return {
    pending: counts.pending || 0,
    processing: counts.processing || 0,
    uploaded: counts.uploaded || 0,
    skipped: counts.skipped || 0,
    failed: counts.failed || 0,
    cancelled: counts.cancelled || 0,
    processed: (counts.uploaded || 0) + (counts.skipped || 0) + (counts.failed || 0) + (counts.cancelled || 0),
  };
}

async function summarizeJob(env: Env, jobId: string) {
  const job = await env.DB.prepare("SELECT * FROM drive_upload_jobs WHERE id = ?").bind(jobId).first() as JobRow | null;
  const { results } = await env.DB.prepare(`
    SELECT id, folder_id, status, result_message, processed_at, created_at
    FROM drive_upload_job_items
    WHERE job_id = ?
    ORDER BY COALESCE(processed_at, created_at) DESC
    LIMIT 20
  `).bind(jobId).all();
  const totalCount = Number(job?.total_count || 0);
  const processedCount = Number(job?.processed_count || 0);
  return {
    id: jobId,
    status: safeText(job?.status),
    totalCount,
    processedCount,
    uploadedCount: Number(job?.uploaded_count || 0),
    skippedCount: Number(job?.skipped_count || 0),
    failedCount: Number(job?.failed_count || 0),
    cancelledCount: Number(job?.cancelled_count || 0),
    percent: totalCount ? Math.round((processedCount / totalCount) * 100) : 0,
    lastError: safeText(job?.last_error),
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

type PushEnv = {
  VAPID_PUBLIC_KEY?: string;
  NEXT_PUBLIC_VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
  VAPID_SUBJECT?: string;
};

async function sendJobPushIfTerminal(env: Env & PushEnv, summary: Awaited<ReturnType<typeof summarizeJob>>) {
  if (!["completed", "failed", "cancelled"].includes(summary.status)) return;
  const title = summary.status === "cancelled"
    ? "Google Drive 업로드 중지됨"
    : summary.failedCount > 0
      ? "일부 파일 업로드 실패"
      : "Google Drive 업로드 완료";
  const body = summary.status === "cancelled"
    ? "사용자가 업로드를 중지했습니다."
    : `전체 ${summary.totalCount}개 · 완료 ${summary.uploadedCount}개 · 이미 존재 ${summary.skippedCount}개 · 실패 ${summary.failedCount}개`;
  try {
    await sendPushNotification(env, { title, body, url: "/photos", tag: summary.failedCount > 0 ? "drive-upload-failed" : "drive-upload-complete" });
  } catch (error) {
    console.error("drive upload job push failed", { jobId: summary.id, error: error instanceof Error ? error.message : String(error) });
  }
}

async function sendPushNotification(env: Env & PushEnv, payload: { title: string; body: string; url: string; tag: string }) {
  const publicKey = env.VAPID_PUBLIC_KEY || env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
  const privateKey = env.VAPID_PRIVATE_KEY || "";
  if (!publicKey || !privateKey) throw new Error("VAPID keys are not configured");
  webpush.setVapidDetails(env.VAPID_SUBJECT || "mailto:admin@rentflow.local", publicKey, privateKey);
  const { results } = await env.DB.prepare("SELECT endpoint, p256dh, auth FROM push_subscriptions ORDER BY created_at DESC").all();
  for (const row of (results || []) as Record<string, unknown>[]) {
    await webpush.sendNotification({
      endpoint: safeText(row.endpoint),
      keys: { p256dh: safeText(row.p256dh), auth: safeText(row.auth) },
    }, JSON.stringify(payload), { TTL: 60 * 60 });
  }
}
