import Fastify from "fastify";
import cors from "@fastify/cors";
import { pool } from "./db.js";
import { registerAuthRoutes } from "./auth.js";

const app = Fastify({ logger: { level: process.env.LOG_LEVEL || "info" } });

// CORS: allow the production frontend + local dev. credentials:true so cookie-bearing
// requests would work in future, but we use Bearer tokens so it's belt-and-braces.
await app.register(cors, {
  origin: ["https://work-heyads.ro", "http://localhost:5173", "http://localhost:4173"],
  credentials: true,
  allowedHeaders: ["Authorization", "Content-Type", "X-Scout-Tab-Id", "Last-Event-ID"],
});

registerAuthRoutes(app);

app.get("/api/healthz", async () => {
  const t0 = Date.now();
  await pool.query("SELECT 1");
  return { ok: true, db_ms: Date.now() - t0, uptime_s: Math.floor(process.uptime()) };
});

const port = parseInt(process.env.PORT || "3030", 10);
app.listen({ port, host: "0.0.0.0" }).then(() => {
  console.log(`[scout-api] listening on ${port}`);
}).catch((err) => {
  console.error("[scout-api] boot failure", err);
  process.exit(1);
});
