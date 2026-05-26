import { pool } from "./db.js";
import { authPreHandler } from "./auth.js";

export function registerBootstrapRoutes(app) {
  app.get("/api/bootstrap", { preHandler: authPreHandler }, async () => {
    const tasksRes = await pool.query(
      `SELECT id, data, version FROM app_data WHERE id LIKE 'task\\_%' ESCAPE '\\'`
    );
    const blobsRes = await pool.query(
      `SELECT id, data, version FROM app_data WHERE id NOT LIKE 'task\\_%' ESCAPE '\\'`
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
