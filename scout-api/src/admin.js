import { authPreHandler } from "./auth.js";
import { pool } from "./db.js";

function requireAdmin(req, reply) {
  if (req.user.role !== "admin") {
    reply.code(403).send({ error: "admin_required" });
    return false;
  }
  return true;
}

export function registerAdminRoutes(app, broadcast) {
  app.post("/api/admin/force-refresh", { preHandler: authPreHandler }, async (req, reply) => {
    if (!requireAdmin(req, reply)) return;
    const at = new Date().toISOString();
    broadcast({ type: "refresh", at, by: req.user.username, tabId: "ADMIN" });
    return { at };
  });

  app.get("/api/admin/healthcheck", { preHandler: authPreHandler }, async (req, reply) => {
    if (!requireAdmin(req, reply)) return;
    const t0 = Date.now();
    const r = await pool.query("SELECT COUNT(*) AS n FROM app_data");
    return { ok: true, db_ms: Date.now() - t0, app_data_rows: parseInt(r.rows[0].n, 10) };
  });
}
