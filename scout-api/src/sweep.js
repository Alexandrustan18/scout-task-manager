import { pool } from "./db.js";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

async function runSweep() {
  try {
    const res = await pool.query(
      `DELETE FROM app_data
        WHERE id LIKE 'task\\_%' ESCAPE '\\'
          AND (data->>'_deleted')::boolean IS TRUE
          AND updated_at < now() - interval '7 days'`
    );
    console.log(`[sweep] hard-deleted ${res.rowCount} tombstoned tasks`);
  } catch (e) {
    console.error("[sweep] failed", e);
  }
}

function msUntilNext4amUTC() {
  const now = new Date();
  const next = new Date(now);
  next.setUTCHours(4, 0, 0, 0);
  if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
  return next - now;
}

export function scheduleSweep() {
  setTimeout(function tick() {
    runSweep();
    setTimeout(tick, ONE_DAY_MS);
  }, msUntilNext4amUTC());
}
