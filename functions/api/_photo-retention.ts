export const PHOTO_CAPTURE_RETENTION_DAYS = 14;

const PHOTO_CAPTURE_WHERE = `
  (
    (
      lower(COALESCE(mime_type, '')) LIKE 'image/%'
      OR lower(COALESCE(mime_type, '')) LIKE 'video/%'
      OR COALESCE(file_type, '') IN ('사진', '영상')
      OR lower(COALESCE(file_name, '')) LIKE '%.jpg'
      OR lower(COALESCE(file_name, '')) LIKE '%.jpeg'
      OR lower(COALESCE(file_name, '')) LIKE '%.png'
      OR lower(COALESCE(file_name, '')) LIKE '%.webp'
      OR lower(COALESCE(file_name, '')) LIKE '%.pdf'
      OR lower(COALESCE(file_name, '')) LIKE '%.mp4'
      OR lower(COALESCE(file_name, '')) LIKE '%.mov'
      OR lower(COALESCE(file_name, '')) LIKE '%.heic'
    )
    AND lower(COALESCE(record_type, '')) NOT IN ('contract', 'contracts', 'dispatchcontract', 'billing', 'billings', 'document', 'documents')
    AND COALESCE(file_type, '') NOT LIKE '%계약%'
    AND COALESCE(file_type, '') NOT LIKE '%청구%'
    AND COALESCE(file_type, '') NOT LIKE '%정산%'
  )
`;

export function activePhotoRetentionWhere(alias = "") {
  const prefix = alias ? `${alias}.` : "";
  return `(
    COALESCE(${prefix}archive_status, '') != 'deleted'
    AND (
      NOT ${PHOTO_CAPTURE_WHERE.replaceAll("mime_type", `${prefix}mime_type`).replaceAll("file_type", `${prefix}file_type`).replaceAll("file_name", `${prefix}file_name`).replaceAll("record_type", `${prefix}record_type`)}
      OR datetime(COALESCE(${prefix}uploaded_at, ${prefix}created_at)) >= datetime('now', '-${PHOTO_CAPTURE_RETENTION_DAYS} days')
    )
  )`;
}

export async function cleanupExpiredPhotoCaptures(db: any, bucket?: any) {
  const { results } = await db.prepare(`
    SELECT id, r2_key, thumbnail_key
    FROM uploaded_files
    WHERE ${PHOTO_CAPTURE_WHERE}
      AND datetime(COALESCE(uploaded_at, created_at)) < datetime('now', '-${PHOTO_CAPTURE_RETENTION_DAYS} days')
  `).all();
  const rows = results || [];

  for (const row of rows) {
    const r2Key = String(row.r2_key || "");
    const thumbnailKey = String(row.thumbnail_key || "");
    if (r2Key && bucket) {
      try {
        await bucket.delete(r2Key);
      } catch (error) {
        console.error("expired photo R2 delete failed", { r2Key, error: error instanceof Error ? error.message : String(error) });
      }
    }
    if (thumbnailKey && bucket) {
      try {
        await bucket.delete(thumbnailKey);
      } catch (error) {
        console.error("expired photo thumbnail R2 delete failed", { thumbnailKey, error: error instanceof Error ? error.message : String(error) });
      }
    }
    await db.prepare("DELETE FROM uploaded_files WHERE id = ?").bind(row.id).run();
  }

  return rows.length;
}

export async function isActivePhotoCaptureObject(db: any, key: string) {
  const row = await db.prepare(`
    SELECT id
    FROM uploaded_files
    WHERE (r2_key = ? OR thumbnail_key = ?)
      AND ${activePhotoRetentionWhere()}
    LIMIT 1
  `).bind(key, key).first();
  return !!row;
}
