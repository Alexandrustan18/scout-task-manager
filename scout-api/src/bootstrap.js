import { pool } from "./db.js";
import { authPreHandler } from "./auth.js";

// Same allowlist as blobs.js — bootstrap must not ship dead-weight rows
// (old backups, archive snapshots) the frontend never reads.
const BOOTSTRAP_BLOB_KEYS = [
  "team", "logs", "sessions", "shops", "products", "timers", "templates",
  "targets", "sheets", "notifs", "taskTypes", "departments", "platforms",
  "loginTrack", "recurringTasks", "statusHistory", "productAudit", "allTags",
  "achievements", "dailyChallenge", "loginHistory", "announcements", "slas",
  "leaves", "leaveRequests", "branding", "pipelineRules", "userXP", "monthlyBonus",
  "wheelConfig", "wheelHistory", "penalties", "penaltyConfig", "taskActivity",
  "leagueArchive", "taskEditors", "errorLog", "taskBackups", "cloud_taskBackups",
  "_forceRefresh",
];

export function registerBootstrapRoutes(app) {
  app.get("/api/bootstrap", { preHandler: authPreHandler }, async () => {
    const tasksRes = await pool.query(
      `SELECT id, data, version FROM app_data WHERE id LIKE 'task\\_%' ESCAPE '\\'`
    );
    const blobsRes = await pool.query(
      `SELECT id, data, version FROM app_data WHERE id = ANY($1::text[])`,
      [BOOTSTRAP_BLOB_KEYS]
    );
    const blobs = {};
    for (const r of blobsRes.rows) {
      blobs[r.id] = { data: r.data, version: r.version };
    }
    return {
      tasks: tasksRes.rows.map((r) => ({
        id: r.id.startsWith("task_") ? r.id.slice(5) : r.id,
        rowId: r.id,
        data: r.data,
        version: r.version,
      })),
      blobs,
      serverTime: new Date().toISOString(),
      lastEventId: globalThis._scoutLastEventId || 0,
    };
  });
}
