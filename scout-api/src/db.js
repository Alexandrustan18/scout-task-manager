import pg from "pg";
const { Pool, types } = pg;

// pg returns BIGINT as string by default — parse to number so === checks against client
// numbers don't false-409. (Safe for version counters; no overflow risk in practice.)
types.setTypeParser(20, (v) => parseInt(v, 10));

export const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on("error", (err) => {
  console.error("[db] pool error", err);
});

/**
 * Optimistic-locking write helper.
 * Returns the new version on success, or null on conflict (version mismatch or missing row).
 */
export async function upsertWithVersion({ id, data, expectedVersion, updatedBy, client = pool }) {
  if (expectedVersion === 0) {
    // INSERT or no-op if exists
    const res = await client.query(
      `INSERT INTO app_data (id, data, version, updated_at, updated_by)
       VALUES ($1, $2::jsonb, 1, now(), $3)
       ON CONFLICT (id) DO NOTHING
       RETURNING version`,
      [id, JSON.stringify(data), updatedBy]
    );
    return res.rowCount ? res.rows[0].version : null;
  }
  const res = await client.query(
    `UPDATE app_data
        SET data = $1::jsonb, version = version + 1, updated_at = now(), updated_by = $2
      WHERE id = $3 AND version = $4
      RETURNING version`,
    [JSON.stringify(data), updatedBy, id, expectedVersion]
  );
  return res.rowCount ? res.rows[0].version : null;
}

export async function getRow(id) {
  const res = await pool.query(`SELECT data, version FROM app_data WHERE id = $1`, [id]);
  return res.rows[0] || null;
}
