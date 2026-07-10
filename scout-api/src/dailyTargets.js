import { pool } from "./db.js";

const ONE_HOUR_MS = 60 * 60 * 1000;

// Bucharest wall-clock date as YYYY-MM-DD (works in Docker/UTC container).
function bucharestDate(nowUtc = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Bucharest",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(nowUtc);
  const y = parts.find(p => p.type === "year").value;
  const m = parts.find(p => p.type === "month").value;
  const d = parts.find(p => p.type === "day").value;
  return `${y}-${m}-${d}`;
}

// Bucharest weekday: 0=Sun, 1..5=Mon..Fri, 6=Sat
function bucharestDow(nowUtc = new Date()) {
  const wk = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Bucharest", weekday: "short",
  }).format(nowUtc);
  return ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].indexOf(wk);
}

function metricMatches(task, metric) {
  if (!metric || metric === "all") return true;
  if (metric.startsWith("type:")) return task.taskType === metric.slice(5);
  if (metric.startsWith("dept:")) return task.department === metric.slice(5);
  if (metric.startsWith("plat:")) return task.platform === metric.slice(5);
  return false;
}

async function readBlob(id) {
  const r = await pool.query(`SELECT data, version FROM app_data WHERE id = $1`, [id]);
  if (r.rowCount === 0) return { data: null, version: 0 };
  return { data: r.rows[0].data, version: r.rows[0].version };
}

async function countDoneToday(assignee, metric, todayStr) {
  // Pull assignee's rows and filter in JS — matches client `calcDone` semantics
  // (exclude _deleted, _campaignParent, campaigns with items > 1).
  const r = await pool.query(
    `SELECT data FROM app_data
      WHERE id LIKE 'task\\_%' ESCAPE '\\'
        AND data->>'assignee' = $1
        AND data->>'status' = 'Done'
        AND left(data->>'updatedAt', 10) = $2`,
    [assignee, todayStr]
  );
  let n = 0;
  for (const row of r.rows) {
    const t = row.data || {};
    if (t._deleted === true) continue;
    if (t._campaignParent === true) continue;
    if (Array.isArray(t.campaignItems) && t.campaignItems.length > 1) continue;
    if (!metricMatches(t, metric)) continue;
    n += 1;
  }
  return n;
}

export async function runDailyTargetCheck({ broadcast } = {}) {
  const now = new Date();
  const todayStr = bucharestDate(now);
  const dow = bucharestDow(now);

  const { data: targets } = await readBlob("targets");
  const { data: team } = await readBlob("team");
  if (!Array.isArray(targets) || !team) {
    console.log("[dailyTargets] no targets or team; skip");
    return { added: 0 };
  }

  // Compute needed additions per target (respecting daysPerWeek + existing entries).
  const additions = [];
  for (const t of targets) {
    if (!t || !t.userId || !t.metric || !t.target || t.active === false) continue;
    const dpw = typeof t.daysPerWeek === "number" ? t.daysPerWeek : 5;
    if (dpw === 5 && (dow === 0 || dow === 6)) continue;

    const user = team[t.userId];
    if (!user || user.role === "admin") continue;

    const done = await countDoneToday(t.userId, t.metric, todayStr);
    if (done >= t.target) continue;

    additions.push({
      userId: t.userId,
      userName: user.name || t.userId,
      target: t.target,
      actualDone: done,
      missed: t.target - done,
      metric: t.metric,
    });
  }

  if (additions.length === 0) {
    console.log(`[dailyTargets] ${todayStr}: all targets hit or no targets active`);
    return { added: 0 };
  }

  // Transactional append to `penalties` blob with dedup.
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const cur = await client.query(
      `SELECT data, version FROM app_data WHERE id = 'penalties' FOR UPDATE`
    );
    const existing = cur.rowCount ? (cur.rows[0].data || []) : [];
    const existingKey = new Set(
      existing
        .filter(p => p && p.reason === "target_missed" && p.date === todayStr)
        .map(p => `${p.userId}|${p.metric}`)
    );

    const nowIso = new Date().toISOString();
    const newEntries = [];
    for (const a of additions) {
      const k = `${a.userId}|${a.metric}`;
      if (existingKey.has(k)) continue;
      newEntries.push({
        id: "srv_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8),
        userId: a.userId,
        userName: a.userName,
        date: todayStr,
        time: nowIso,
        reason: "target_missed",
        target: a.target,
        actualDone: a.actualDone,
        missed: a.missed,
        metric: a.metric,
        overdueCount: a.missed, // reused by existing popup threshold display
      });
    }

    if (newEntries.length === 0) {
      await client.query("COMMIT");
      console.log(`[dailyTargets] ${todayStr}: all missed already recorded`);
      return { added: 0 };
    }

    const merged = newEntries.concat(existing).slice(0, 1000);
    let newVersion;
    if (cur.rowCount === 0) {
      const ins = await client.query(
        `INSERT INTO app_data (id, data, version, updated_at, updated_by)
         VALUES ('penalties', $1::jsonb, 1, now(), 'system_target_check')
         RETURNING version`,
        [JSON.stringify(merged)]
      );
      newVersion = ins.rows[0].version;
    } else {
      const upd = await client.query(
        `UPDATE app_data
            SET data = $1::jsonb, version = version + 1, updated_at = now(), updated_by = 'system_target_check'
          WHERE id = 'penalties'
          RETURNING version`,
        [JSON.stringify(merged)]
      );
      newVersion = upd.rows[0].version;
    }
    await client.query("COMMIT");

    if (broadcast) {
      broadcast({
        type: "blob_change",
        id: "penalties",
        data: merged,
        version: newVersion,
        by: "system_target_check",
        tabId: "server-cron",
      });
    }

    console.log(`[dailyTargets] ${todayStr}: added ${newEntries.length} target_missed penalt${newEntries.length===1?"y":"ies"}`);
    for (const e of newEntries) {
      console.log(`  - ${e.userName} (${e.metric}): ${e.actualDone}/${e.target} => missed ${e.missed}`);
    }
    return { added: newEntries.length };
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[dailyTargets] tx failed", err);
    return { error: err.message };
  } finally {
    client.release();
  }
}

// Cron: fire once per calendar day (Bucharest) shortly after 22:00 local.
// Strategy: tick every hour; the first tick where Bucharest local hour is 22 AND
// today's date differs from lastRunDate → run. Robust across DST + container restarts.
let _lastRunBucharestDate = null;
export function scheduleDailyTargetCheck({ broadcast } = {}) {
  const tick = async () => {
    try {
      const now = new Date();
      const bDate = bucharestDate(now);
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "Europe/Bucharest", hour: "2-digit", hour12: false,
      }).formatToParts(now);
      const hour = parseInt(parts.find(p => p.type === "hour").value, 10);
      if (hour >= 22 && _lastRunBucharestDate !== bDate) {
        _lastRunBucharestDate = bDate;
        await runDailyTargetCheck({ broadcast });
      }
    } catch (e) {
      console.error("[dailyTargets] tick error", e);
    }
  };
  // First tick immediately (in case boot happens after 22:00 same day).
  tick();
  setInterval(tick, ONE_HOUR_MS);
}
