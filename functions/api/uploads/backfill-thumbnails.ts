import { ensureColumns, noStoreHeaders } from "../_d1-utils";

type Env = {
  DB: any;
  RENTFLOW_UPLOADS?: any;
};

const CACHE_CONTROL = "public,max-age=31536000,immutable";

export async function onRequestPost({ request, env }: { request: Request; env: Env }) {
  try {
    if (!env.DB || !env.RENTFLOW_UPLOADS) {
      return Response.json({ processed: 0, created: 0, skipped: 0, remaining: 0, error: "DB or R2 is not configured" }, { status: 500, headers: noStoreHeaders() });
    }

    await ensureUploadedFilesThumbnailSchema(env);
    const body = await readJson(request);
    const batchSize = Math.max(1, Math.min(Number(body.batchSize || 20) || 20, 50));
    const { results } = await env.DB.prepare(`
      SELECT id, file_name, r2_key, r2_url, mime_type
      FROM uploaded_files
      WHERE COALESCE(thumbnail_url, '') = ''
        AND COALESCE(r2_key, '') != ''
        AND (
          lower(COALESCE(mime_type, '')) IN ('image/jpeg', 'image/png', 'image/webp')
          OR lower(COALESCE(file_name, '')) LIKE '%.jpg'
          OR lower(COALESCE(file_name, '')) LIKE '%.jpeg'
          OR lower(COALESCE(file_name, '')) LIKE '%.png'
          OR lower(COALESCE(file_name, '')) LIKE '%.webp'
        )
        AND lower(COALESCE(file_name, '')) NOT LIKE '%.heic'
      ORDER BY id ASC
      LIMIT ?
    `).bind(batchSize).all();

    let created = 0;
    let skipped = 0;
    const rows = results || [];

    for (const row of rows) {
      try {
        const id = Number(row.id);
        const sourceKey = String(row.r2_key || "");
        if (!id || !sourceKey) {
          skipped += 1;
          continue;
        }

        const imageUrl = thumbnailTransformUrl(request.url, sourceKey);
        const resized = await fetch(imageUrl, { headers: { Accept: "image/webp,image/*" } });
        if (!resized.ok) {
          skipped += 1;
          continue;
        }

        const contentType = resized.headers.get("content-type") || "image/webp";
        if (!contentType.startsWith("image/")) {
          skipped += 1;
          continue;
        }

        const thumbnailKey = `thumbnails/${id}.webp`;
        await env.RENTFLOW_UPLOADS.put(thumbnailKey, await resized.arrayBuffer(), {
          httpMetadata: { contentType: "image/webp", cacheControl: CACHE_CONTROL },
        });
        const thumbnailUrl = `/api/uploads?key=${encodeURIComponent(thumbnailKey)}`;
        await env.DB.prepare("UPDATE uploaded_files SET thumbnail_url = ?, thumbnail_key = ? WHERE id = ?").bind(thumbnailUrl, thumbnailKey, id).run();
        created += 1;
      } catch (error) {
        console.error("thumbnail backfill row failed", { id: row.id, error: error instanceof Error ? error.message : String(error) });
        skipped += 1;
      }
    }

    const remainingRow = await env.DB.prepare(`
      SELECT COUNT(*) AS count
      FROM uploaded_files
      WHERE COALESCE(thumbnail_url, '') = ''
        AND COALESCE(r2_key, '') != ''
        AND (
          lower(COALESCE(mime_type, '')) IN ('image/jpeg', 'image/png', 'image/webp')
          OR lower(COALESCE(file_name, '')) LIKE '%.jpg'
          OR lower(COALESCE(file_name, '')) LIKE '%.jpeg'
          OR lower(COALESCE(file_name, '')) LIKE '%.png'
          OR lower(COALESCE(file_name, '')) LIKE '%.webp'
        )
        AND lower(COALESCE(file_name, '')) NOT LIKE '%.heic'
    `).first();
    const remaining = Number(remainingRow?.count || 0);

    return Response.json({ processed: rows.length, created, skipped, remaining }, { headers: noStoreHeaders() });
  } catch (error) {
    console.error("thumbnail backfill failed", { error: error instanceof Error ? error.message : String(error) });
    return Response.json({ processed: 0, created: 0, skipped: 0, remaining: 0, error: String(error) }, { status: 500, headers: noStoreHeaders() });
  }
}

function thumbnailTransformUrl(requestUrl: string, sourceKey: string) {
  const encodedKey = encodeURIComponent(sourceKey);
  return new URL(`/cdn-cgi/image/width=300,fit=scale-down,format=webp/api/uploads?key=${encodedKey}`, requestUrl).toString();
}

async function ensureUploadedFilesThumbnailSchema(env: Env) {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS uploaded_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_name TEXT NOT NULL,
      r2_url TEXT NOT NULL,
      r2_key TEXT NOT NULL,
      thumbnail_url TEXT,
      thumbnail_key TEXT,
      mime_type TEXT,
      uploaded_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
  await ensureColumns(env.DB, "uploaded_files", [
    { name: "thumbnail_url", definition: "TEXT" },
    { name: "thumbnail_key", definition: "TEXT" },
    { name: "mime_type", definition: "TEXT" },
    { name: "uploaded_at", definition: "DATETIME" },
    { name: "created_at", definition: "DATETIME" },
  ]);
}

async function readJson(request: Request) {
  try {
    return await request.json() as Record<string, unknown>;
  } catch {
    return {};
  }
}
