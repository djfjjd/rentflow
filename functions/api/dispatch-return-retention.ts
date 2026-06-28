import { ensureColumns, noStoreHeaders } from "./_d1-utils";

type Env = {
  DB: any;
};

const RETENTION_REASON = "dispatch_return_one_year_retention";

export async function onRequestGet({ env }: { env: Env }) {
  try {
    await ensureRetentionSchema(env.DB);
    const counts = await countExpiredRecords(env.DB);
    return Response.json({ ...counts, total: counts.dispatches + counts.returns }, { headers: noStoreHeaders() });
  } catch (error) {
    console.error("dispatch return retention count failed", { error: error instanceof Error ? error.message : String(error) });
    return Response.json({ error: String(error) }, { status: 500, headers: noStoreHeaders() });
  }
}

export async function onRequestPost({ env }: { env: Env }) {
  try {
    await ensureRetentionSchema(env.DB);
    const before = await countExpiredRecords(env.DB);
    const dispatchResult = await archiveExpiredDispatches(env.DB);
    const returnResult = await archiveExpiredReturns(env.DB);
    const archived = {
      dispatches: dispatchResult.meta?.changes || 0,
      returns: returnResult.meta?.changes || 0,
    };
    console.log("dispatch return retention archived", {
      before,
      archived,
      reason: RETENTION_REASON,
    });
    return Response.json({ before, archived, total: archived.dispatches + archived.returns }, { headers: noStoreHeaders() });
  } catch (error) {
    console.error("dispatch return retention archive failed", { error: error instanceof Error ? error.message : String(error) });
    return Response.json({ error: String(error) }, { status: 500, headers: noStoreHeaders() });
  }
}

async function ensureRetentionSchema(db: any) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS dispatches (
      id TEXT PRIMARY KEY,
      date TEXT,
      return_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS returns (
      id TEXT PRIMARY KEY,
      date TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
  await ensureColumns(db, "dispatches", [
    { name: "date", definition: "TEXT" },
    { name: "return_at", definition: "DATETIME" },
    { name: "created_at", definition: "DATETIME" },
    { name: "updated_at", definition: "DATETIME" },
    { name: "retention_archived_at", definition: "DATETIME" },
    { name: "retention_archived_reason", definition: "TEXT" },
  ]);
  await ensureColumns(db, "returns", [
    { name: "date", definition: "TEXT" },
    { name: "created_at", definition: "DATETIME" },
    { name: "updated_at", definition: "DATETIME" },
    { name: "retention_archived_at", definition: "DATETIME" },
    { name: "retention_archived_reason", definition: "TEXT" },
  ]);
}

async function countExpiredRecords(db: any) {
  const dispatches = await db.prepare(`
    SELECT COUNT(*) AS count
    FROM dispatches
    WHERE retention_archived_at IS NULL
      AND ${expiredDispatchWhere()}
  `).first() as { count?: number } | null;
  const returns = await db.prepare(`
    SELECT COUNT(*) AS count
    FROM returns
    WHERE retention_archived_at IS NULL
      AND ${expiredReturnWhere()}
  `).first() as { count?: number } | null;
  return {
    dispatches: Number(dispatches?.count || 0),
    returns: Number(returns?.count || 0),
  };
}

async function archiveExpiredDispatches(db: any) {
  return await db.prepare(`
    UPDATE dispatches
    SET retention_archived_at = CURRENT_TIMESTAMP,
        retention_archived_reason = ?
    WHERE retention_archived_at IS NULL
      AND ${expiredDispatchWhere()}
  `).bind(RETENTION_REASON).run();
}

async function archiveExpiredReturns(db: any) {
  return await db.prepare(`
    UPDATE returns
    SET retention_archived_at = CURRENT_TIMESTAMP,
        retention_archived_reason = ?
    WHERE retention_archived_at IS NULL
      AND ${expiredReturnWhere()}
  `).bind(RETENTION_REASON).run();
}

function expiredDispatchWhere() {
  return `
    datetime(COALESCE(NULLIF(created_at, ''), NULLIF(date, ''), NULLIF(return_at, ''), NULLIF(updated_at, '')))
      < datetime('now', '-1 year')
  `;
}

function expiredReturnWhere() {
  return `
    datetime(COALESCE(NULLIF(created_at, ''), NULLIF(date, ''), NULLIF(updated_at, '')))
      < datetime('now', '-1 year')
  `;
}
