import { pool, getRow, upsertWithVersion } from "./db.js";
import { authPreHandler } from "./auth.js";
import { applyOp } from "./patchOps.js";

const ALLOWED_BLOB_KEYS = new Set([
  "team", "logs", "sessions", "shops", "products", "timers", "templates",
  "targets", "sheets", "notifs", "taskTypes", "departments", "platforms",
  "loginTrack", "recurringTasks", "statusHistory", "productAudit", "allTags",
  "achievements", "dailyChallenge", "loginHistory", "announcements", "slas",
  "leaves", "leaveRequests", "branding", "pipelineRules", "userXP", "monthlyBonus",
  "wheelConfig", "wheelHistory", "penalties", "penaltyConfig", "taskActivity",
  "leagueArchive", "taskEditors", "errorLog", "taskBackups", "cloud_taskBackups",
]);

function assertKey(key) {
  if (!ALLOWED_BLOB_KEYS.has(key)) {
    const e = new Error("forbidden_key");
    e.statusCode = 403;
    throw e;
  }
}

export function registerBlobRoutes(app, broadcast) {
  app.get("/api/blob/:key", { preHandler: authPreHandler }, async (req) => {
    assertKey(req.params.key);
    const row = await getRow(req.params.key);
    if (!row) return { data: null, version: 0 };
    return { data: row.data, version: row.version };
  });

  app.put("/api/blob/:key", { preHandler: authPreHandler }, async (req, reply) => {
    assertKey(req.params.key);
    const { data, version } = req.body || {};
    if (typeof version !== "number") return reply.code(400).send({ error: "version_required" });
    const newVersion = await upsertWithVersion({
      id: req.params.key,
      data,
      expectedVersion: version,
      updatedBy: req.user.username,
    });
    if (newVersion == null) {
      const current = await getRow(req.params.key);
      return reply.code(409).send({
        error: "version_conflict",
        currentVersion: current?.version ?? 0,
        currentData: current?.data ?? null,
      });
    }
    broadcast({
      type: "blob_change",
      id: req.params.key,
      data,
      version: newVersion,
      by: req.user.username,
      tabId: req.tabId,
    });
    return { version: newVersion };
  });

  app.patch("/api/blob/:key", { preHandler: authPreHandler }, async (req, reply) => {
    assertKey(req.params.key);
    const { op, version } = req.body || {};
    if (typeof version !== "number") return reply.code(400).send({ error: "version_required" });
    if (!op || typeof op.op !== "string") return reply.code(400).send({ error: "op_required" });

    // Transactional read-modify-write
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const cur = await client.query(
        `SELECT data, version FROM app_data WHERE id = $1 FOR UPDATE`,
        [req.params.key]
      );
      let baseData, baseVersion;
      if (cur.rowCount === 0) {
        if (version !== 0) {
          await client.query("ROLLBACK");
          return reply.code(409).send({ error: "version_conflict", currentVersion: 0, currentData: null });
        }
        baseData = null;
        baseVersion = 0;
      } else {
        baseData = cur.rows[0].data;
        baseVersion = cur.rows[0].version;
        if (baseVersion !== version) {
          await client.query("ROLLBACK");
          return reply.code(409).send({ error: "version_conflict", currentVersion: baseVersion, currentData: baseData });
        }
      }
      const newData = applyOp(baseData, op);
      let newVersion;
      if (baseVersion === 0) {
        const ins = await client.query(
          `INSERT INTO app_data (id, data, version, updated_at, updated_by)
           VALUES ($1, $2::jsonb, 1, now(), $3)
           RETURNING version`,
          [req.params.key, JSON.stringify(newData), req.user.username]
        );
        newVersion = ins.rows[0].version;
      } else {
        const upd = await client.query(
          `UPDATE app_data SET data = $1::jsonb, version = version + 1, updated_at = now(), updated_by = $2
            WHERE id = $3 RETURNING version`,
          [JSON.stringify(newData), req.user.username, req.params.key]
        );
        newVersion = upd.rows[0].version;
      }
      await client.query("COMMIT");

      broadcast({
        type: "blob_change",
        id: req.params.key,
        data: newData,
        version: newVersion,
        by: req.user.username,
        tabId: req.tabId,
      });
      return { version: newVersion, data: newData };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  });
}
