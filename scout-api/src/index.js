import Fastify from "fastify";
import cors from "@fastify/cors";
import { pool } from "./db.js";
import { registerAuthRoutes, authPreHandler } from "./auth.js";
import { registerBootstrapRoutes } from "./bootstrap.js";
import { registerBlobRoutes } from "./blobs.js";
import { registerTaskRoutes } from "./tasks.js";
import { registerEventsRoutes, broadcast, sseStats } from "./events.js";
import { scheduleSweep } from "./sweep.js";
import { registerAdminRoutes } from "./admin.js";
import { scheduleDailyTargetCheck, runDailyTargetCheck } from "./dailyTargets.js";

// bodyLimit 20MB: taskActivity/statusHistory/logs blobs can grow past Fastify's
// default 1MB. Rejecting them 413 leaves clients stuck retrying forever.
const app = Fastify({
  logger: { level: process.env.LOG_LEVEL || "info" },
  bodyLimit: 20 * 1024 * 1024,
});

// CORS: allow the production frontend + local dev. credentials:true so cookie-bearing
// requests would work in future, but we use Bearer tokens so it's belt-and-braces.
await app.register(cors, {
  origin: ["https://work-heyads.ro", "http://localhost:5173", "http://localhost:4173"],
  credentials: true,
  allowedHeaders: ["Authorization", "Content-Type", "X-Scout-Tab-Id", "Last-Event-ID"],
});

registerAuthRoutes(app);
registerBootstrapRoutes(app);
registerBlobRoutes(app, broadcast);
registerTaskRoutes(app, broadcast);
registerEventsRoutes(app);
registerAdminRoutes(app, broadcast);

app.get("/api/healthz", async () => {
  const t0 = Date.now();
  await pool.query("SELECT 1");
  const mem = process.memoryUsage();
  return {
    ok: true,
    db_ms: Date.now() - t0,
    uptime_s: Math.floor(process.uptime()),
    mem_mb: Math.round(mem.rss / 1048576),
    ...sseStats(),
  };
});

app.post("/api/heartbeat", { preHandler: authPreHandler }, async () => {
  return { ok: true, serverTime: new Date().toISOString() };
});

const port = parseInt(process.env.PORT || "3030", 10);
// Admin-only manual trigger for the daily target check — for debugging / catch-up.
app.post("/api/admin/run-target-check", { preHandler: authPreHandler }, async (req, reply) => {
  if (req.user.role !== "admin") return reply.code(403).send({ error: "forbidden" });
  const result = await runDailyTargetCheck({ broadcast });
  return { ok: true, result };
});

app.listen({ port, host: "0.0.0.0" }).then(() => {
  console.log(`[scout-api] listening on ${port}`);
  scheduleSweep();
  scheduleDailyTargetCheck({ broadcast });
}).catch((err) => {
  console.error("[scout-api] boot failure", err);
  process.exit(1);
});
