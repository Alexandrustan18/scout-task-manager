# Scout API Server — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a Node API service on the existing GCP VM that mediates all writes between browsers and Postgres, with versioned conflict detection and SSE realtime. Replace the direct-to-PostgREST / Supabase-Realtime data layer in `src/App.jsx`.

**Architecture:** A `scout-api` Docker container (Node 22 + Fastify) on the same VM as Supabase self-host. nginx proxies `/api/*` to it. Direct `pg` connection to the existing Postgres container. JWT auth (plaintext password compare server-side, matches current behavior). Per-row `version` column with `RETURNING`-based optimistic locking. SSE channel with ring-buffer replay and `full_resync` for long-disconnected tabs.

**Tech Stack:** Node 22, Fastify 4, `pg` (node-postgres), `jose` (JWT), native SSE. Existing: Postgres 15 (Docker), nginx (host), Vercel-deployed React 18 + Vite frontend.

**Reference docs:**
- Spec: `docs/superpowers/specs/2026-05-26-scout-api-server-design.md`
- Existing app: `src/App.jsx` (~9k-line monolith)
- VM credentials: `~/secrets-scout-tasks/credentials-20260518.txt`
- VM: `scout-tasks` in `europe-west1-b`, GCP project `scout-ai-491712`

**Pre-flight context (don't skip):**
- VM has Docker, nginx, Postgres 15, Supabase self-host stack. No Node on the host. 614 MB free RAM at idle. SSH access via `gcloud compute ssh scout-tasks --zone=europe-west1-b`.
- The `app_data` table has columns `id text PRIMARY KEY, data jsonb, updated_at timestamptz`. We're adding `version bigint` and `updated_by text`.
- Current frontend has 36 keys hot-saved on every state change. The new API receives ALL of those writes via PUT/PATCH `/api/blob/:key`.
- Cutover uses the existing `_forceRefresh` mechanism in `App.jsx` (line ~1050): an admin writes a row, all browsers running the old bundle receive it via Supabase Realtime, show a toast, and reload after 5s. We trigger this AFTER the new bundle is on Vercel.
- Keep PostgREST + Supabase Realtime ALIVE through the cutover. They're the broadcast channel for the last-ever `_forceRefresh`. Disable them only after Phase 4 confirms zero traffic.

**Deploy pattern:**
- API: build + push Docker image, update docker-compose on the VM, `docker compose up -d scout-api`.
- Frontend: push to `main` on GitHub, Vercel auto-deploys.
- DB migration: `psql` through the existing Supabase `db` container.

---

## File Structure

| File | Purpose |
|---|---|
| `scout-api/Dockerfile` | Node 22-alpine image. |
| `scout-api/package.json` | Fastify, pg, jose, no dev deps. |
| `scout-api/src/index.js` | Boot, plugin registration, listen on port 3030. |
| `scout-api/src/db.js` | pg Pool, queryWithVersion helper, JSON utilities. |
| `scout-api/src/auth.js` | `/api/login`, JWT sign/verify hook, plaintext-compare. |
| `scout-api/src/blobs.js` | `/api/blob/:key` GET/PUT/PATCH endpoints. |
| `scout-api/src/tasks.js` | `/api/tasks` and `/api/tasks/:id` endpoints. |
| `scout-api/src/bootstrap.js` | `/api/bootstrap` (single-call world dump). |
| `scout-api/src/events.js` | `/api/events` SSE handler, ring buffer, broadcast. |
| `scout-api/src/admin.js` | `/api/admin/*` endpoints. |
| `scout-api/src/heartbeat.js` | `/api/heartbeat` endpoint. |
| `scout-api/src/sweep.js` | Daily background job that hard-deletes `_deleted=true` tasks > 7 days. |
| `scout-api/migrations/001_add_version.sql` | Adds version + updated_by columns + index. |
| `docker-compose.yml` (on VM) | Add `scout-api` service. |
| `/etc/nginx/sites-available/scout-tasks` (on VM) | Add `/api/` location. |
| `src/api.js` (new in repo) | Frontend client: auth, retry queue, EventSource. |
| `src/App.jsx` | Replace cloudSave/cloudLoad/_cloudSaveTasksPerRow with `api.*` calls. Add save-status UI + offline banner. |

---

## Task 1: VM snapshot for rollback safety

**Files:** none. GCP CLI only.

- [ ] **Step 1: Confirm gcloud is authenticated**

Run:
```bash
gcloud config get-value account
gcloud config get-value project
```

Expected: `mhibogdan@gmail.com` and `scout-ai-491712`.

- [ ] **Step 2: List the VM disk**

Run:
```bash
gcloud compute instances describe scout-tasks --zone=europe-west1-b --format="value(disks[0].source)" | xargs basename
```

Expected: `scout-tasks` (the disk name).

- [ ] **Step 3: Create the snapshot**

Run:
```bash
gcloud compute disks snapshot scout-tasks \
  --zone=europe-west1-b \
  --snapshot-names=scout-tasks-pre-api-$(date +%Y%m%d-%H%M%S) \
  --description="Before scout-api rebuild"
```

Expected: `Created [...].` with the snapshot ID. Note it for the report.

- [ ] **Step 4: Verify the snapshot landed**

Run:
```bash
gcloud compute snapshots list --filter="name~scout-tasks-pre-api" --limit=5
```

Expected: at least one snapshot with status `READY` or `CREATING`.

- [ ] **Step 5: Commit nothing**

Snapshot is GCP-side; no repo changes.

---

## Task 2: Apply DB migration (add version column)

**Files:**
- Create: `scout-api/migrations/001_add_version.sql`
- Apply: via `docker compose exec db psql` on the VM.

- [ ] **Step 1: Write the migration locally**

Use the Write tool to create `/Users/bogdanpeltea/Desktop/scout-task-manager/scout-api/migrations/001_add_version.sql`:

```sql
-- Adds optimistic-locking version column to app_data.
-- Idempotent: safe to re-run.

ALTER TABLE app_data ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 1;
ALTER TABLE app_data ADD COLUMN IF NOT EXISTS updated_by TEXT;
CREATE INDEX IF NOT EXISTS app_data_version_idx ON app_data (id, version);

-- Sanity check: row count should not change
SELECT COUNT(*) AS total_rows FROM app_data;
```

- [ ] **Step 2: Copy migration to the VM**

Run:
```bash
gcloud compute scp /Users/bogdanpeltea/Desktop/scout-task-manager/scout-api/migrations/001_add_version.sql \
  scout-tasks:/tmp/001_add_version.sql --zone=europe-west1-b
```

Expected: silent success.

- [ ] **Step 3: Apply via the existing Supabase db container**

Run:
```bash
gcloud compute ssh scout-tasks --zone=europe-west1-b --command="docker exec -i supabase-db psql -U postgres -d postgres < /tmp/001_add_version.sql"
```

Expected output ends with `total_rows` count > 3000.

- [ ] **Step 4: Verify schema**

Run:
```bash
gcloud compute ssh scout-tasks --zone=europe-west1-b --command="docker exec supabase-db psql -U postgres -d postgres -c '\\d app_data'"
```

Expected: table description includes `version | bigint | not null | 1` and `updated_by | text |`.

- [ ] **Step 5: Verify all existing rows are at version 1**

Run:
```bash
gcloud compute ssh scout-tasks --zone=europe-west1-b --command="docker exec supabase-db psql -U postgres -d postgres -c 'SELECT version, COUNT(*) FROM app_data GROUP BY version;'"
```

Expected: a single row showing `version=1` and a count matching total_rows.

- [ ] **Step 6: Commit**

Run:
```bash
cd /Users/bogdanpeltea/Desktop/scout-task-manager
git add scout-api/migrations/001_add_version.sql
git commit -m "Migration: add version + updated_by to app_data"
```

---

## Task 3: Scaffold scout-api Node container

**Files:**
- Create: `scout-api/package.json`, `scout-api/Dockerfile`, `scout-api/.dockerignore`, `scout-api/src/index.js`, `scout-api/src/db.js`.

- [ ] **Step 1: Write `scout-api/package.json`**

```json
{
  "name": "scout-api",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js"
  },
  "dependencies": {
    "fastify": "^4.28.1",
    "@fastify/cors": "^9.0.1",
    "pg": "^8.13.0",
    "jose": "^5.9.6"
  },
  "engines": {
    "node": ">=22"
  }
}
```

- [ ] **Step 2: Write `scout-api/Dockerfile`**

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev --no-audit --no-fund
COPY src/ ./src/
COPY migrations/ ./migrations/
ENV NODE_ENV=production
ENV PORT=3030
EXPOSE 3030
CMD ["node", "src/index.js"]
```

- [ ] **Step 3: Write `scout-api/.dockerignore`**

```
node_modules
.git
*.md
.env*
```

- [ ] **Step 4: Write `scout-api/src/db.js`**

```js
import pg from "pg";
const { Pool } = pg;

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
```

- [ ] **Step 5: Write `scout-api/src/index.js` (boot only — endpoints added in later tasks)**

```js
import Fastify from "fastify";
import cors from "@fastify/cors";
import { pool } from "./db.js";

const app = Fastify({ logger: { level: process.env.LOG_LEVEL || "info" } });

// CORS: allow the production frontend + local dev. credentials:true so cookie-bearing
// requests would work in future, but we use Bearer tokens so it's belt-and-braces.
await app.register(cors, {
  origin: ["https://work-heyads.ro", "http://localhost:5173", "http://localhost:4173"],
  credentials: true,
  allowedHeaders: ["Authorization", "Content-Type", "X-Scout-Tab-Id", "Last-Event-ID"],
});

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
```

- [ ] **Step 6: Generate package-lock.json locally**

Run:
```bash
cd /Users/bogdanpeltea/Desktop/scout-task-manager/scout-api && npm install --package-lock-only
```

Expected: creates `package-lock.json`, no install errors.

- [ ] **Step 7: Build the image locally to smoke-test**

Run:
```bash
cd /Users/bogdanpeltea/Desktop/scout-task-manager/scout-api && docker build -t scout-api:dev .
```

Expected: ends with `Successfully tagged scout-api:dev`. ~30s build time.

- [ ] **Step 8: Commit**

```bash
cd /Users/bogdanpeltea/Desktop/scout-task-manager
git add scout-api/
git commit -m "scout-api: scaffold Fastify boot + pg pool + healthz"
```

---

## Task 4: Auth endpoints (/api/login, JWT verify hook, /api/me)

**Files:**
- Create: `scout-api/src/auth.js`
- Modify: `scout-api/src/index.js` (register auth routes + hook)

- [ ] **Step 1: Write `scout-api/src/auth.js`**

```js
import { SignJWT, jwtVerify } from "jose";
import { readFileSync } from "node:fs";
import { getRow } from "./db.js";

function loadSecret() {
  if (process.env.JWT_SECRET_FILE) {
    try { return readFileSync(process.env.JWT_SECRET_FILE, "utf8").trim(); } catch {}
  }
  return process.env.JWT_SECRET || "dev-secret-change-me";
}
const SECRET = new TextEncoder().encode(loadSecret());
const TOKEN_TTL_HOURS = 12;

export async function signToken({ username, role }) {
  return await new SignJWT({ role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(username)
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_TTL_HOURS}h`)
    .sign(SECRET);
}

export async function verifyToken(token) {
  const { payload } = await jwtVerify(token, SECRET);
  return payload;
}

export async function authPreHandler(req, reply) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) {
    reply.code(401).send({ error: "no_token" });
    return;
  }
  try {
    const payload = await verifyToken(token);
    req.user = { username: payload.sub, role: payload.role };
    req.tabId = req.headers["x-scout-tab-id"] || "no-tab";
  } catch {
    reply.code(401).send({ error: "invalid_token" });
  }
}

export function registerAuthRoutes(app) {
  app.post("/api/login", {
    schema: {
      body: {
        type: "object",
        required: ["username", "password"],
        properties: {
          username: { type: "string" },
          password: { type: "string" },
        },
      },
    },
  }, async (req, reply) => {
    const { username, password } = req.body;
    const teamRow = await getRow("team");
    if (!teamRow) return reply.code(500).send({ error: "no_team_row" });
    const team = teamRow.data || {};
    const user = team[username];
    if (!user) return reply.code(401).send({ error: "bad_credentials" });
    if (user.password !== password) return reply.code(401).send({ error: "bad_credentials" });
    const token = await signToken({ username, role: user.role });
    // Return only public fields
    const publicUser = {
      username,
      name: user.name,
      role: user.role,
      color: user.color,
      access: user.access,
      team: user.team,
      pm: user.pm,
      assignableBy: user.assignableBy,
    };
    return { token, user: publicUser, serverTime: new Date().toISOString() };
  });

  app.get("/api/me", { preHandler: authPreHandler }, async (req) => {
    const teamRow = await getRow("team");
    const u = (teamRow?.data || {})[req.user.username] || {};
    return {
      user: {
        username: req.user.username,
        name: u.name,
        role: u.role,
        color: u.color,
      },
      serverTime: new Date().toISOString(),
    };
  });
}
```

- [ ] **Step 2: Update `scout-api/src/index.js` to register auth routes**

Old:
```js
import Fastify from "fastify";
import cors from "@fastify/cors";
import { pool } from "./db.js";

const app = Fastify({ logger: { level: process.env.LOG_LEVEL || "info" } });

await app.register(cors, { origin: true, credentials: true });

app.get("/api/healthz", async () => {
```

New:
```js
import Fastify from "fastify";
import cors from "@fastify/cors";
import { pool } from "./db.js";
import { registerAuthRoutes } from "./auth.js";

const app = Fastify({ logger: { level: process.env.LOG_LEVEL || "info" } });

await app.register(cors, { origin: true, credentials: true });

registerAuthRoutes(app);

app.get("/api/healthz", async () => {
```

- [ ] **Step 3: Rebuild image**

Run:
```bash
cd /Users/bogdanpeltea/Desktop/scout-task-manager/scout-api && docker build -t scout-api:dev .
```

Expected: success.

- [ ] **Step 4: Commit**

```bash
git add scout-api/src/
git commit -m "scout-api: /api/login + /api/me + JWT verify hook"
```

---

## Task 5: Bootstrap endpoint (the world in one GET)

**Files:**
- Create: `scout-api/src/bootstrap.js`
- Modify: `scout-api/src/index.js`

- [ ] **Step 1: Write `scout-api/src/bootstrap.js`**

```js
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
        id: r.id.startsWith("task_") ? r.id.slice(5) : r.id, // inner id
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
```

- [ ] **Step 2: Wire it in `scout-api/src/index.js`**

Add `import { registerBootstrapRoutes } from "./bootstrap.js";` and call `registerBootstrapRoutes(app);` after `registerAuthRoutes(app);`.

- [ ] **Step 3: Rebuild and smoke-test the boot**

Run:
```bash
cd /Users/bogdanpeltea/Desktop/scout-task-manager/scout-api && docker build -t scout-api:dev . && echo OK
```

- [ ] **Step 4: Commit**

```bash
git add scout-api/src/
git commit -m "scout-api: /api/bootstrap returns tasks+blobs+serverTime"
```

---

## Task 6: Blob endpoints (PUT, PATCH, GET)

**Files:**
- Create: `scout-api/src/blobs.js`, `scout-api/src/patchOps.js`
- Modify: `scout-api/src/index.js`

- [ ] **Step 1: Write `scout-api/src/patchOps.js`**

```js
// PATCH op vocabulary — see spec for semantics.

function getAtPath(obj, path) {
  let cur = obj;
  for (const p of path) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
}

function setAtPath(obj, path, value) {
  if (path.length === 0) return value;
  const out = Array.isArray(obj) ? obj.slice() : Object.assign({}, obj);
  let cur = out;
  for (let i = 0; i < path.length - 1; i++) {
    const k = path[i];
    if (cur[k] == null || typeof cur[k] !== "object") cur[k] = {};
    else cur[k] = Array.isArray(cur[k]) ? cur[k].slice() : Object.assign({}, cur[k]);
    cur = cur[k];
  }
  cur[path[path.length - 1]] = value;
  return out;
}

function deleteAtPath(obj, path) {
  if (path.length === 0) return obj;
  const out = Array.isArray(obj) ? obj.slice() : Object.assign({}, obj);
  let cur = out;
  for (let i = 0; i < path.length - 1; i++) {
    const k = path[i];
    if (cur[k] == null) return out;
    cur[k] = Array.isArray(cur[k]) ? cur[k].slice() : Object.assign({}, cur[k]);
    cur = cur[k];
  }
  delete cur[path[path.length - 1]];
  return out;
}

export function applyOp(data, op) {
  const { op: kind, path = [], value, max, where, patch } = op;
  const baseObj = data == null ? {} : data;
  switch (kind) {
    case "set_field":
      return setAtPath(baseObj, path, value);
    case "delete_field":
      return deleteAtPath(baseObj, path);
    case "array_append": {
      const arr = getAtPath(baseObj, path);
      const base = Array.isArray(arr) ? arr.slice() : [];
      base.push(value);
      const trimmed = max && base.length > max ? base.slice(-max) : base;
      return setAtPath(baseObj, path, trimmed);
    }
    case "array_remove": {
      const arr = getAtPath(baseObj, path);
      if (!Array.isArray(arr)) return baseObj;
      const filtered = arr.filter((it) => !(it && it[where.field] === where.eq));
      return setAtPath(baseObj, path, filtered);
    }
    case "array_update": {
      const arr = getAtPath(baseObj, path);
      if (!Array.isArray(arr)) return baseObj;
      const updated = arr.map((it) =>
        it && it[where.field] === where.eq ? Object.assign({}, it, patch) : it
      );
      return setAtPath(baseObj, path, updated);
    }
    default:
      throw new Error(`unknown_op:${kind}`);
  }
}
```

- [ ] **Step 2: Write `scout-api/src/blobs.js`**

```js
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
```

- [ ] **Step 3: Register in index.js**

Add `import { registerBlobRoutes } from "./blobs.js";` and the call after bootstrap. NOTE: needs `broadcast` from the events module — we'll wire it after Task 8 (events). For now pass a no-op placeholder:

```js
import { registerBlobRoutes } from "./blobs.js";
// ... after registerBootstrapRoutes(app):
const noopBroadcast = () => {};
registerBlobRoutes(app, noopBroadcast);
```

We'll replace `noopBroadcast` with the real broadcast function in Task 8.

- [ ] **Step 4: Rebuild + commit**

```bash
cd /Users/bogdanpeltea/Desktop/scout-task-manager/scout-api && docker build -t scout-api:dev . && cd .. && git add scout-api/src/ && git commit -m "scout-api: blob endpoints (PUT/PATCH/GET) with version checks"
```

---

## Task 7: Task endpoints (per-row CRUD)

**Files:**
- Create: `scout-api/src/tasks.js`
- Modify: `scout-api/src/index.js`

- [ ] **Step 1: Write `scout-api/src/tasks.js`**

```js
import { pool, getRow, upsertWithVersion } from "./db.js";
import { authPreHandler } from "./auth.js";

export function registerTaskRoutes(app, broadcast) {
  app.post("/api/tasks", { preHandler: authPreHandler }, async (req, reply) => {
    const taskData = req.body?.data;
    if (!taskData || !taskData.id) return reply.code(400).send({ error: "data.id required" });
    const rowId = "task_" + taskData.id;
    const v = await upsertWithVersion({
      id: rowId,
      data: taskData,
      expectedVersion: 0,
      updatedBy: req.user.username,
    });
    if (v == null) return reply.code(409).send({ error: "exists" });
    broadcast({ type: "task_change", rowId, id: taskData.id, data: taskData, version: v, by: req.user.username, tabId: req.tabId });
    return { id: taskData.id, version: v };
  });

  app.put("/api/tasks/:id", { preHandler: authPreHandler }, async (req, reply) => {
    const { data, version } = req.body || {};
    if (typeof version !== "number" || !data) return reply.code(400).send({ error: "bad_body" });
    if (data.id !== req.params.id) return reply.code(400).send({ error: "id_mismatch" });
    const rowId = "task_" + req.params.id;
    const v = await upsertWithVersion({
      id: rowId,
      data,
      expectedVersion: version,
      updatedBy: req.user.username,
    });
    if (v == null) {
      const cur = await getRow(rowId);
      return reply.code(409).send({ error: "version_conflict", currentVersion: cur?.version ?? 0, currentData: cur?.data ?? null });
    }
    broadcast({ type: "task_change", rowId, id: req.params.id, data, version: v, by: req.user.username, tabId: req.tabId });
    return { version: v };
  });

  app.delete("/api/tasks/:id", { preHandler: authPreHandler }, async (req, reply) => {
    const { version } = req.body || {};
    if (typeof version !== "number") return reply.code(400).send({ error: "version_required" });
    const rowId = "task_" + req.params.id;
    const cur = await getRow(rowId);
    if (!cur) return reply.code(404).send({ error: "not_found" });
    const newData = Object.assign({}, cur.data, { _deleted: true });
    const v = await upsertWithVersion({
      id: rowId,
      data: newData,
      expectedVersion: version,
      updatedBy: req.user.username,
    });
    if (v == null) return reply.code(409).send({ error: "version_conflict", currentVersion: cur.version, currentData: cur.data });
    broadcast({ type: "task_change", rowId, id: req.params.id, data: newData, version: v, by: req.user.username, tabId: req.tabId });
    return { version: v, ok: true };
  });
}
```

- [ ] **Step 2: Register in index.js**

Add `import { registerTaskRoutes } from "./tasks.js";` and the call: `registerTaskRoutes(app, noopBroadcast);`.

- [ ] **Step 3: Rebuild + commit**

```bash
cd /Users/bogdanpeltea/Desktop/scout-task-manager/scout-api && docker build -t scout-api:dev . && cd .. && git add scout-api/src/ && git commit -m "scout-api: task CRUD endpoints with version checks"
```

---

## Task 8: SSE events endpoint + broadcast wiring

**Files:**
- Create: `scout-api/src/events.js`
- Modify: `scout-api/src/index.js`

- [ ] **Step 1: Write `scout-api/src/events.js`**

```js
import { authPreHandler, verifyToken } from "./auth.js";

const RING_SIZE = 5000;
const ring = new Array(RING_SIZE).fill(null); // {id, event, dataStr}
let ringHead = 0;          // next write index
let lastEventId = 0;
globalThis._scoutLastEventId = 0;

const clients = new Set(); // { res, tabId, username }

function ringPush(entry) {
  ring[ringHead] = entry;
  ringHead = (ringHead + 1) % RING_SIZE;
}

function ringEntriesAfter(afterId) {
  // walk from oldest to newest
  const out = [];
  for (let i = 0; i < RING_SIZE; i++) {
    const idx = (ringHead + i) % RING_SIZE;
    const e = ring[idx];
    if (e && e.id > afterId) out.push(e);
  }
  return out;
}

export function broadcast(payload) {
  lastEventId += 1;
  globalThis._scoutLastEventId = lastEventId;
  const entry = {
    id: lastEventId,
    event: payload.type,
    dataStr: JSON.stringify({ ...payload, eventId: lastEventId }),
  };
  ringPush(entry);
  const line = `id: ${entry.id}\nevent: ${entry.event}\ndata: ${entry.dataStr}\n\n`;
  for (const c of clients) {
    try { c.res.raw.write(line); } catch {}
  }
}

export function registerEventsRoutes(app) {
  app.get("/api/events", async (req, reply) => {
    // Auth via query (?token=) OR header (EventSource can't set headers)
    const token = req.query.token || (req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization.slice(7) : null);
    if (!token) return reply.code(401).send({ error: "no_token" });
    let payload;
    try { payload = await verifyToken(token); } catch { return reply.code(401).send({ error: "invalid_token" }); }
    const tabId = req.query.tab || "no-tab";
    const username = payload.sub;

    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-store",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    });

    // Replay
    const lastIdHeader = parseInt(req.headers["last-event-id"] || "0", 10);
    if (lastIdHeader > 0) {
      const missed = ringEntriesAfter(lastIdHeader);
      const oldestInRing = ring.find((e) => e !== null);
      if (missed.length === 0 && oldestInRing && oldestInRing.id > lastIdHeader) {
        // gap beyond ring → full resync
        reply.raw.write(`id: ${lastEventId}\nevent: full_resync\ndata: {}\n\n`);
      } else {
        for (const e of missed) {
          reply.raw.write(`id: ${e.id}\nevent: ${e.event}\ndata: ${e.dataStr}\n\n`);
        }
      }
    } else {
      reply.raw.write(`id: ${lastEventId}\nevent: hello\ndata: ${JSON.stringify({ lastEventId, serverTime: new Date().toISOString() })}\n\n`);
    }

    // Heartbeat ping every 25s to keep proxies happy
    const ping = setInterval(() => {
      try { reply.raw.write(`: ping\n\n`); } catch {}
    }, 25000);

    const client = { res: reply, tabId, username };
    clients.add(client);

    req.raw.on("close", () => {
      clearInterval(ping);
      clients.delete(client);
    });

    // Fastify needs us to "hijack" the response so it doesn't try to send any reply itself
    return reply;
  });
}

export function sseStats() {
  return { clients: clients.size, lastEventId };
}
```

- [ ] **Step 2: Wire broadcast in index.js**

Replace the `noopBroadcast` lines with the real one:

```js
import { registerEventsRoutes, broadcast } from "./events.js";
// ...
registerBlobRoutes(app, broadcast);
registerTaskRoutes(app, broadcast);
registerEventsRoutes(app);
```

Delete the `const noopBroadcast = () => {};` line.

- [ ] **Step 3: Add `/api/healthz` enrichment + heartbeat endpoint**

At the top of `index.js`, add to the existing imports:

```js
import { sseStats } from "./events.js";
import { authPreHandler } from "./auth.js";
```

Replace the existing `app.get("/api/healthz", ...)` with:

```js
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
```

- [ ] **Step 4: Rebuild + commit**

```bash
cd /Users/bogdanpeltea/Desktop/scout-task-manager/scout-api && docker build -t scout-api:dev . && cd .. && git add scout-api/src/ && git commit -m "scout-api: SSE /api/events with replay buffer + heartbeat"
```

---

## Task 8b: Sweep job (daily hard-delete of tombstoned tasks)

**Files:**
- Create: `scout-api/src/sweep.js`
- Modify: `scout-api/src/index.js`

- [ ] **Step 1: Write `scout-api/src/sweep.js`**

```js
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
```

- [ ] **Step 2: Call from `index.js`**

After the `app.listen({...}).then(...)` call, add:

```js
import { scheduleSweep } from "./sweep.js";
scheduleSweep();
```

- [ ] **Step 3: Rebuild + commit**

```bash
cd /Users/bogdanpeltea/Desktop/scout-task-manager/scout-api && docker build -t scout-api:dev . && cd .. && git add scout-api/src/ && git commit -m "scout-api: daily sweep of tombstoned tasks"
```

---

## Task 9: Admin endpoints

**Files:**
- Create: `scout-api/src/admin.js`
- Modify: `scout-api/src/index.js`

- [ ] **Step 1: Write `scout-api/src/admin.js`**

```js
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
```

- [ ] **Step 2: Register in index.js**

```js
import { registerAdminRoutes } from "./admin.js";
// ...
registerAdminRoutes(app, broadcast);
```

- [ ] **Step 3: Rebuild + commit**

```bash
cd /Users/bogdanpeltea/Desktop/scout-task-manager/scout-api && docker build -t scout-api:dev . && cd .. && git add scout-api/src/ && git commit -m "scout-api: admin endpoints"
```

---

## Task 10: Deploy scout-api to the VM

**Files:**
- Modify: docker-compose on VM (`/home/bogdan/scout-tasks/docker-compose.yml` or wherever the supabase stack lives).
- Modify: nginx config on VM.

- [ ] **Step 1: Generate the JWT secret**

Run:
```bash
gcloud compute ssh scout-tasks --zone=europe-west1-b --command="openssl rand -hex 32 | sudo tee /root/scout_api_jwt_secret.txt > /dev/null && sudo chmod 600 /root/scout_api_jwt_secret.txt && echo SECRET_GENERATED"
```

Expected: `SECRET_GENERATED`.

- [ ] **Step 2: Copy the scout-api source to the VM**

Run:
```bash
cd /Users/bogdanpeltea/Desktop/scout-task-manager
gcloud compute scp --recurse scout-api/ scout-tasks:/tmp/scout-api/ --zone=europe-west1-b
gcloud compute ssh scout-tasks --zone=europe-west1-b --command="sudo mkdir -p /home/bogdan/scout-tasks/scout-api && sudo cp -r /tmp/scout-api/* /home/bogdan/scout-tasks/scout-api/ && sudo chown -R bogdan:bogdan /home/bogdan/scout-tasks/scout-api/"
```

Expected: silent success.

- [ ] **Step 3: Determine the existing docker-compose path**

Run:
```bash
gcloud compute ssh scout-tasks --zone=europe-west1-b --command="sudo find / -name 'docker-compose.yml' -path '*supabase*' 2>/dev/null"
```

Note the path printed — call it `$DC_PATH`. Most likely `/home/bogdan/supabase/docker/docker-compose.yml`.

- [ ] **Step 4: Find the network name used by the supabase stack**

Run:
```bash
gcloud compute ssh scout-tasks --zone=europe-west1-b --command="docker network ls --format '{{.Name}}' | grep -i supabase"
```

Note the network name — call it `$NET_NAME` (probably `supabase_default` or `docker_default`).

- [ ] **Step 5: Add scout-api service to docker-compose (programmatically)**

Instead of editing in-place with `nano`, create a separate compose override file. That keeps the existing supabase compose untouched and is much safer for a subagent.

On the VM, create `/home/bogdan/supabase/docker/docker-compose.scout-api.yml`:

```bash
gcloud compute ssh scout-tasks --zone=europe-west1-b --command='sudo tee /home/bogdan/supabase/docker/docker-compose.scout-api.yml > /dev/null << "YAML"
services:
  scout-api:
    image: scout-api:local
    build: /home/bogdan/scout-tasks/scout-api
    container_name: scout-api
    restart: unless-stopped
    environment:
      POSTGRES_URL: postgres://postgres:${POSTGRES_PASSWORD}@db:5432/postgres
      JWT_SECRET_FILE: /run/secrets/scout_api_jwt
      LOG_LEVEL: info
    secrets:
      - scout_api_jwt
    ports:
      - "127.0.0.1:3030:3030"
    depends_on:
      - db

secrets:
  scout_api_jwt:
    file: /root/scout_api_jwt_secret.txt
YAML'
```

Compose will merge the override with the main file when invoked with `-f`. Verify:

```bash
gcloud compute ssh scout-tasks --zone=europe-west1-b --command="cd /home/bogdan/supabase/docker && sudo docker compose -f docker-compose.yml -f docker-compose.scout-api.yml config 2>&1 | head -50"
```

Expected: full merged compose output including the scout-api section.

NOTE: From here on, all `docker compose ...` invocations on the VM must include both files: `-f docker-compose.yml -f docker-compose.scout-api.yml`. Add a wrapper script `/home/bogdan/supabase/docker/dc-with-api.sh`:

```bash
gcloud compute ssh scout-tasks --zone=europe-west1-b --command='sudo tee /home/bogdan/supabase/docker/dc-with-api.sh > /dev/null << "SH"
#!/usr/bin/env bash
cd /home/bogdan/supabase/docker
sudo docker compose -f docker-compose.yml -f docker-compose.scout-api.yml "$@"
SH
sudo chmod +x /home/bogdan/supabase/docker/dc-with-api.sh'
```

- [ ] **Step 6: (no-op — JWT_SECRET_FILE is already supported in auth.js from Task 4)**

The container reads `JWT_SECRET_FILE` env var at boot (mapped from the Docker secret at `/run/secrets/scout_api_jwt`). Confirm by reading `scout-api/src/auth.js` — it should already have the `loadSecret()` function. Skip ahead to Step 7.

- [ ] **Step 7: Build the container on the VM and start it**

```bash
gcloud compute ssh scout-tasks --zone=europe-west1-b --command="/home/bogdan/supabase/docker/dc-with-api.sh build scout-api && /home/bogdan/supabase/docker/dc-with-api.sh up -d scout-api"
```

Expected: image build succeeds, container starts.

- [ ] **Step 8: Verify scout-api boots correctly**

```bash
gcloud compute ssh scout-tasks --zone=europe-west1-b --command="docker logs --tail 30 scout-api && curl -sS http://127.0.0.1:3030/api/healthz"
```

Expected: log shows `[scout-api] listening on 3030`, healthz returns `{"ok":true, "db_ms":<small>, ...}`.

- [ ] **Step 9: Add nginx location for /api/**

Edit `/etc/nginx/sites-available/scout-tasks` on the VM. Add inside the existing `server { ... }` block:

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:3030;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 3600s;
    proxy_send_timeout 3600s;
    proxy_buffering off;
    proxy_cache off;
}
```

Reload:
```bash
gcloud compute ssh scout-tasks --zone=europe-west1-b --command="sudo nginx -t && sudo systemctl reload nginx"
```

Expected: `nginx: configuration file ... test is successful`.

- [ ] **Step 10: Verify external access**

```bash
curl -sS https://34-62-56-73.nip.io/api/healthz
```

Expected: same JSON as Step 8.

- [ ] **Step 11: Test login + bootstrap end-to-end**

```bash
TOK=$(curl -sS -X POST https://34-62-56-73.nip.io/api/login -H "Content-Type: application/json" -d '{"username":"bogdan","password":"bogdan2026"}' | python3 -c "import json,sys; print(json.load(sys.stdin)['token'])")
echo "Token: ${TOK:0:40}..."
curl -sS https://34-62-56-73.nip.io/api/bootstrap -H "Authorization: Bearer $TOK" | python3 -c "import json,sys; d=json.load(sys.stdin); print('tasks=', len(d['tasks']), 'blobs=', len(d['blobs']))"
```

Expected: `Token: eyJ...` (long string), `tasks= 3000+ blobs= 30+`.

- [ ] **Step 12: Commit any local config changes**

```bash
cd /Users/bogdanpeltea/Desktop/scout-task-manager
git add scout-api/src/auth.js
git commit -m "scout-api: support JWT_SECRET_FILE for Docker secrets"
```

---

## Task 11: Frontend client module (`src/api.js`)

**Files:**
- Create: `src/api.js` (new file in the React repo)

- [ ] **Step 1: Write the full `src/api.js`**

Use the Write tool with this content:

```js
// Scout API client. Replaces direct Supabase/PostgREST writes from App.jsx.
// Pattern: load bootstrap on mount, open EventSource, queue writes, version-check, broadcast.

const API = "/api";
const TOKEN_KEY = "s7_token";
const TAB_KEY = "s7_tabId";
const BOOT_CACHE_KEY = "s7_bootstrap_cache";

let _token = localStorage.getItem(TOKEN_KEY) || "";
let _tabId = sessionStorage.getItem(TAB_KEY) || "";
if (!_tabId) {
  _tabId = (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));
  sessionStorage.setItem(TAB_KEY, _tabId);
}

const versions = {}; // {rowId: version}
const subscribers = new Set(); // {fn} for state updates
const statusSubscribers = new Set();
let saveStatus = { state: "synced", queueLen: 0, lastError: null }; // 'synced'|'saving'|'offline'|'error'

function setStatus(patch) {
  saveStatus = { ...saveStatus, ...patch };
  for (const fn of statusSubscribers) try { fn(saveStatus); } catch {}
}
export function onStatus(fn) { statusSubscribers.add(fn); return () => statusSubscribers.delete(fn); }
export function getStatus() { return saveStatus; }

function authHeaders() {
  return {
    "Authorization": "Bearer " + _token,
    "X-Scout-Tab-Id": _tabId,
    "Content-Type": "application/json",
  };
}

async function apiFetch(path, opts = {}) {
  const r = await fetch(API + path, {
    method: opts.method || "GET",
    headers: { ...authHeaders(), ...(opts.headers || {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (r.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    window.location.reload();
    throw new Error("unauthorized");
  }
  return r;
}

// ---------- Auth ----------
export async function login(username, password) {
  const r = await fetch(API + "/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    throw new Error(e.error || "login_failed");
  }
  const out = await r.json();
  _token = out.token;
  localStorage.setItem(TOKEN_KEY, _token);
  // Wipe any cached bootstrap from a previous user/session.
  localStorage.removeItem(BOOT_CACHE_KEY);
  Object.keys(versions).forEach((k) => delete versions[k]);
  return out;
}

export function logout() {
  _token = "";
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(BOOT_CACHE_KEY);
  if (eventStream) eventStream.close();
}

export function hasToken() { return !!_token; }

// ---------- Bootstrap ----------
export async function bootstrap() {
  const r = await apiFetch("/bootstrap");
  if (!r.ok) throw new Error("bootstrap_failed");
  const out = await r.json();
  // populate versions map
  for (const t of out.tasks) versions["task_" + t.id] = t.version;
  for (const k of Object.keys(out.blobs)) versions[k] = out.blobs[k].version;
  try { localStorage.setItem(BOOT_CACHE_KEY, JSON.stringify(out)); } catch {}
  return out;
}

export function loadCachedBootstrap() {
  try {
    const raw = localStorage.getItem(BOOT_CACHE_KEY);
    if (!raw) return null;
    const out = JSON.parse(raw);
    for (const t of out.tasks) versions["task_" + t.id] = t.version;
    for (const k of Object.keys(out.blobs)) versions[k] = out.blobs[k].version;
    return out;
  } catch { return null; }
}

export function getVersion(rowId) { return versions[rowId] ?? 0; }
export function setVersion(rowId, v) { versions[rowId] = v; }

// ---------- Writes with retry queue ----------
const writeQueue = [];
let draining = false;

function enqueue(req) {
  writeQueue.push(req);
  setStatus({ queueLen: writeQueue.length, state: "saving" });
  drain();
}

async function drain() {
  if (draining) return;
  draining = true;
  while (writeQueue.length > 0) {
    const job = writeQueue[0];
    try {
      const r = await apiFetch(job.path, { method: job.method, body: job.body });
      if (r.status === 409) {
        // Conflict: replace local state, drop this write
        const c = await r.json();
        versions[job.rowId] = c.currentVersion;
        if (job.onConflict) try { job.onConflict(c); } catch {}
        writeQueue.shift();
        continue;
      }
      if (!r.ok) {
        job.retries = (job.retries || 0) + 1;
        if (job.retries > 3) {
          console.warn("[api] dropping after 3 retries", job.path);
          writeQueue.shift();
          setStatus({ state: "error", lastError: "save_failed" });
          continue;
        }
        const wait = Math.pow(4, job.retries) * 250; // 250, 1000, 4000 ms
        await new Promise((res) => setTimeout(res, wait));
        continue; // retry same job
      }
      const out = await r.json();
      if (out && typeof out.version === "number") versions[job.rowId] = out.version;
      if (job.onAck) try { job.onAck(out); } catch {}
      writeQueue.shift();
    } catch (e) {
      // network error
      job.retries = (job.retries || 0) + 1;
      if (job.retries > 5) {
        writeQueue.shift();
        setStatus({ state: "offline", lastError: "network" });
        continue;
      }
      await new Promise((res) => setTimeout(res, 2000));
    }
  }
  draining = false;
  setStatus({ queueLen: 0, state: heartbeatOK ? "synced" : "offline" });
}

export function saveBlob(key, data, opts = {}) {
  enqueue({
    rowId: key,
    path: "/blob/" + encodeURIComponent(key),
    method: "PUT",
    body: { data, version: versions[key] ?? 0 },
    onConflict: opts.onConflict,
    onAck: opts.onAck,
  });
}

export function patchBlob(key, op, opts = {}) {
  enqueue({
    rowId: key,
    path: "/blob/" + encodeURIComponent(key),
    method: "PATCH",
    body: { op, version: versions[key] ?? 0 },
    onConflict: opts.onConflict,
    onAck: opts.onAck,
  });
}

export function saveTask(taskData, opts = {}) {
  const rowId = "task_" + taskData.id;
  const v = versions[rowId];
  if (v == null || v === 0) {
    enqueue({ rowId, path: "/tasks", method: "POST", body: { data: taskData }, onConflict: opts.onConflict, onAck: opts.onAck });
  } else {
    enqueue({ rowId, path: "/tasks/" + encodeURIComponent(taskData.id), method: "PUT", body: { data: taskData, version: v }, onConflict: opts.onConflict, onAck: opts.onAck });
  }
}

export function deleteTask(id, opts = {}) {
  const rowId = "task_" + id;
  enqueue({ rowId, path: "/tasks/" + encodeURIComponent(id), method: "DELETE", body: { version: versions[rowId] ?? 0 }, onConflict: opts.onConflict, onAck: opts.onAck });
}

// ---------- Heartbeat ----------
let heartbeatOK = true;
let heartbeatMisses = 0;
let heartbeatTimer = null;
export function startHeartbeat() {
  if (heartbeatTimer) return;
  const tick = async () => {
    try {
      const r = await apiFetch("/heartbeat", { method: "POST" });
      if (r.ok) {
        heartbeatOK = true;
        heartbeatMisses = 0;
        if (saveStatus.state === "offline" && writeQueue.length === 0) setStatus({ state: "synced" });
      } else {
        heartbeatMisses += 1;
      }
    } catch {
      heartbeatMisses += 1;
    }
    if (heartbeatMisses >= 3) {
      heartbeatOK = false;
      setStatus({ state: "offline" });
    }
  };
  tick();
  heartbeatTimer = setInterval(tick, 30000);
}

// ---------- SSE ----------
let eventStream = null;
let lastEventId = 0;
const eventHandlers = new Set(); // {fn(event)}

export function onRowChange(fn) { eventHandlers.add(fn); return () => eventHandlers.delete(fn); }

export function openEvents() {
  if (eventStream) eventStream.close();
  const url = `${API}/events?tab=${encodeURIComponent(_tabId)}&token=${encodeURIComponent(_token)}`;
  eventStream = new EventSource(url);
  eventStream.addEventListener("hello", (ev) => {
    try { lastEventId = JSON.parse(ev.data).lastEventId || 0; } catch {}
  });
  const handleChange = (ev) => {
    try {
      const data = JSON.parse(ev.data);
      lastEventId = data.eventId || lastEventId;
      if (data.tabId === _tabId) return; // skip our own echo
      // Update versions immediately so subsequent writes use fresh version
      if (data.id) versions[data.id] = data.version;
      for (const fn of eventHandlers) try { fn(data); } catch {}
    } catch {}
  };
  eventStream.addEventListener("blob_change", handleChange);
  eventStream.addEventListener("task_change", handleChange);
  eventStream.addEventListener("refresh", (ev) => {
    // Server-initiated reload (admin force-refresh)
    const last = localStorage.getItem("s7_lastForceRefresh");
    let at = "";
    try { at = JSON.parse(ev.data).at; } catch {}
    if (last === at) return;
    if (at) localStorage.setItem("s7_lastForceRefresh", at);
    setTimeout(() => window.location.reload(), 5000);
  });
  eventStream.addEventListener("full_resync", async () => {
    // Re-fetch the world; UI will replace state via the subscriber.
    const fresh = await bootstrap();
    for (const fn of eventHandlers) try { fn({ type: "full_resync", bootstrap: fresh }); } catch {}
  });
  eventStream.onerror = () => {
    // EventSource auto-reconnects; just update status
    setStatus({ state: "offline" });
  };
  eventStream.onopen = () => {
    if (writeQueue.length === 0) setStatus({ state: "synced" });
  };
}

export function closeEvents() { if (eventStream) eventStream.close(); eventStream = null; }

export function tabId() { return _tabId; }
```

- [ ] **Step 2: Verify build**

```bash
cd /Users/bogdanpeltea/Desktop/scout-task-manager && npx vite build 2>&1 | tail -5
```

Expected: `✓ built in ...`.

- [ ] **Step 3: Commit**

```bash
git add src/api.js && git commit -m "Frontend: src/api.js client module"
```

---

## Task 12: Wire `src/api.js` into `App.jsx` (the big migration)

**Files:**
- Modify: `src/App.jsx` (many spots).

This is the biggest task. It's broken into sub-steps because the code touches many places. Subagent should be patient and not skip anything.

- [ ] **Step 1: Add the `USE_API` feature flag at the top of `App.jsx`**

After line 8 (`var supabase = createClient(...)`), add:

```js
import * as API from "./api.js";
// Feature flag: when true, all data ops go through the new Node API.
// When false (legacy), the existing supabase-js + raw fetch paths are used.
// DEFAULT FALSE until Task 15 cutover — keep legacy path active so the first deploy after
// these changes doesn't break anyone if the API isn't reachable.
var USE_API = false;
```

The flag will be flipped to `true` in Task 15 step 1, immediately before triggering the auto-reload.

- [ ] **Step 2: Replace `handleLogin`**

Find the existing `handleLogin` function (around line ~1976). Replace its body to use `API.login` when `USE_API`:

```js
var handleLogin = async function(u, pw) {
  if (USE_API) {
    try {
      var out = await API.login(u, pw);
      setUser(out.user.username);
      localStorage.setItem("s7_user", JSON.stringify(out.user.username));
      addLog("LOGIN", (out.user.name || u) + " a intrat");
      // load the world
      var boot = await API.bootstrap();
      _applyBootstrap(boot);
      API.openEvents();
      API.startHeartbeat();
      return true;
    } catch (e) {
      console.error("login failed", e);
      return false;
    }
  }
  // ...existing legacy login body unchanged below...
};
```

Define `_applyBootstrap` near the top of the component:

```js
var _applyBootstrap = function(boot) {
  // Reduce bootstrap into the 36 state slots
  var b = boot.blobs || {};
  if (b.team) setTeam(b.team.data);
  if (b.logs) setLogs(b.logs.data);
  if (b.sessions) setSessions(b.sessions.data);
  if (b.shops) setShops(b.shops.data);
  if (b.products) setProducts(b.products.data);
  if (b.timers) setTimers(b.timers.data);
  if (b.templates) setTemplates(b.templates.data);
  if (b.targets) setTargets(b.targets.data);
  if (b.sheets) setSheets(b.sheets.data);
  if (b.notifs) setNotifications(b.notifs.data || []);
  if (b.taskTypes) setTaskTypes(b.taskTypes.data);
  if (b.departments) setDepartments(b.departments.data);
  if (b.platforms) setPlatforms(b.platforms.data);
  if (b.loginTrack) setLoginTrack(b.loginTrack.data);
  if (b.recurringTasks) setRecurringTasks(b.recurringTasks.data);
  if (b.statusHistory) setStatusHistory(b.statusHistory.data);
  if (b.productAudit) setProductAudit(b.productAudit.data);
  if (b.allTags) setAllTags(b.allTags.data);
  if (b.achievements) setAchievements(b.achievements.data);
  if (b.dailyChallenge) setDailyChallenge(b.dailyChallenge.data);
  if (b.loginHistory) setLoginHistory(b.loginHistory.data);
  if (b.announcements) setAnnouncements(b.announcements.data);
  if (b.slas) setSlas(b.slas.data);
  if (b.leaves) setLeaves(b.leaves.data);
  if (b.leaveRequests) setLeaveRequests(b.leaveRequests.data);
  if (b.branding) setBranding(b.branding.data);
  if (b.pipelineRules) setPipelineRules(b.pipelineRules.data);
  if (b.userXP) setUserXP(b.userXP.data);
  if (b.monthlyBonus) setMonthlyBonus(b.monthlyBonus.data);
  if (b.wheelConfig) setWheelConfig(b.wheelConfig.data);
  if (b.wheelHistory) setWheelHistory(b.wheelHistory.data);
  if (b.penalties) setPenalties(b.penalties.data);
  if (b.penaltyConfig) setPenaltyConfig(b.penaltyConfig.data);
  if (b.taskActivity) setTaskActivity(b.taskActivity.data);
  if (b.leagueArchive) setLeagueArchive(b.leagueArchive.data);
  if (b.taskEditors) setTaskEditors(b.taskEditors.data);
  // Tasks
  var taskArr = (boot.tasks || []).map(function(t) { return t.data; });
  _setTasks(taskArr);
  tasksRef.current = taskArr;
};
```

Tricky bit: the state setters (`setTeam`, etc.) all exist in the App component scope. Make sure `_applyBootstrap` is declared INSIDE the App component (not module-level).

- [ ] **Step 3: Replace `loadAll()` for the USE_API path**

Find the existing `loadAll` (line ~898). Wrap its body:

```js
var loadAll = async function() {
  if (USE_API) {
    if (!API.hasToken()) {
      setLoading(false);
      return;
    }
    var cached = API.loadCachedBootstrap();
    if (cached) _applyBootstrap(cached);
    try {
      var fresh = await API.bootstrap();
      _applyBootstrap(fresh);
      API.openEvents();
      API.startHeartbeat();
    } catch (e) {
      console.error("bootstrap failed", e);
    }
    setLoading(false);
    return;
  }
  // ...existing legacy body unchanged...
};
```

- [ ] **Step 4: Replace `cloudSave` calls at the persist-on-change useEffects**

Each `useEffect(function() { if (!loading && _firstRenderDoneRef.current) debouncedSave("KEY", VALUE, DELAY); }, [VALUE]);` should call `API.saveBlob("KEY", VALUE)` when USE_API — **unless the new value matches what we just received from the server** (shadow check to avoid SSE → setState → useEffect → saveBlob ping-pong).

Add a ref AT THE TOP OF the App component body (right after the useState declarations):

```js
var _shadowBlobs = useRef({});  // {key: data we got from server} — used to suppress SSE-echo writes
```

Add the persist helper **INSIDE the App component** (so it can close over `_shadowBlobs`):

```js
var persist = function(key, value, delay) {
  if (USE_API) {
    // Skip if this state matches what we received from server (i.e. it came from SSE).
    if (_shadowBlobs.current[key] !== undefined &&
        JSON.stringify(_shadowBlobs.current[key]) === JSON.stringify(value)) {
      return;
    }
    _shadowBlobs.current[key] = value; // remember what we're about to write
    API.saveBlob(key, value);
  } else {
    debouncedSave(key, value, delay);
  }
};
```

In the SSE `blob_change` handler (Step 6), set `_shadowBlobs.current[k] = d` BEFORE calling the setter. Same for `task_change` — though tasks are per-row and don't go through this useEffect pattern.

Then replace each `debouncedSave(...)` call (in the useEffects starting around line 1396) with `persist(...)`. The pattern is mechanical: every line matching `debouncedSave("XXX", XXX, NNN)` becomes `persist("XXX", XXX, NNN)`. There are 36 such lines.

Grep to find them all:

```bash
grep -n "debouncedSave(" /Users/bogdanpeltea/Desktop/scout-task-manager/src/App.jsx
```

Each of the ~36 hits inside a `useEffect` should be swapped 1:1.

- [ ] **Step 5: Replace task save path**

The `setTasks` wrapper at line ~779 calls `immediateSave("tasks", ...)`. For USE_API, the wrapper should diff vs the previous tasks array and emit per-task `API.saveTask(...)` calls only for changed/new tasks. Add a `_lastApiTaskState` ref to track previous.

```js
var _lastApiTaskState = useRef([]);

// In the setTasks wrapper, after computing `newTasks`:
if (USE_API) {
  var prev = _lastApiTaskState.current || [];
  var prevById = {}; for (var i = 0; i < prev.length; i++) prevById[prev[i].id] = prev[i];
  var newById = {}; for (var j = 0; j < newTasks.length; j++) newById[newTasks[j].id] = newTasks[j];
  // Find added/changed
  for (var k = 0; k < newTasks.length; k++) {
    var nt = newTasks[k];
    var pt = prevById[nt.id];
    if (!pt) { API.saveTask(nt); }
    else if (pt.updatedAt !== nt.updatedAt || pt._deleted !== nt._deleted) { API.saveTask(nt); }
  }
  // Find removed (treat as soft delete)
  for (var l = 0; l < prev.length; l++) {
    if (!newById[prev[l].id] && !prev[l]._deleted) { API.deleteTask(prev[l].id); }
  }
  _lastApiTaskState.current = newTasks.slice();
} else {
  // existing immediateSave("tasks", newTasks)
}
```

- [ ] **Step 6: Wire SSE event handler to update React state**

After `loadAll`, subscribe to `API.onRowChange`:

```js
useEffect(function() {
  if (!USE_API) return;
  var unsubChange = API.onRowChange(function(ev) {
    if (ev.type === "task_change") {
      _setTasks(function(prev) {
        var found = false;
        var next = prev.map(function(t) {
          if (t.id === ev.id) { found = true; return ev.data; }
          return t;
        });
        if (!found) next = [ev.data].concat(next);
        tasksRef.current = next;
        // CRITICAL: update the diff baseline so the next user-originated setTasks
        // doesn't re-emit a duplicate write for this realtime-updated task.
        if (_lastApiTaskState && _lastApiTaskState.current) {
          var foundB = false;
          var baseline = _lastApiTaskState.current.map(function(t) {
            if (t.id === ev.id) { foundB = true; return ev.data; }
            return t;
          });
          if (!foundB) baseline = [ev.data].concat(baseline);
          _lastApiTaskState.current = baseline;
        }
        return next;
      });
      return;
    }
    if (ev.type === "blob_change") {
      // Apply to the corresponding state setter via a switch — every blob key in the allow-list
      var k = ev.id; var d = ev.data;
      if (k === "team") setTeam(d);
      else if (k === "logs") setLogs(d);
      else if (k === "sessions") setSessions(d);
      else if (k === "shops") setShops(d);
      else if (k === "products") setProducts(d);
      else if (k === "timers") setTimers(d);
      else if (k === "templates") setTemplates(d);
      else if (k === "targets") setTargets(d);
      else if (k === "sheets") setSheets(d);
      else if (k === "notifs") setNotifications(d || []);
      else if (k === "taskTypes") setTaskTypes(d);
      else if (k === "departments") setDepartments(d);
      else if (k === "platforms") setPlatforms(d);
      else if (k === "loginTrack") setLoginTrack(d);
      else if (k === "recurringTasks") setRecurringTasks(d);
      else if (k === "statusHistory") setStatusHistory(d);
      else if (k === "productAudit") setProductAudit(d);
      else if (k === "allTags") setAllTags(d);
      else if (k === "achievements") setAchievements(d);
      else if (k === "dailyChallenge") setDailyChallenge(d);
      else if (k === "loginHistory") setLoginHistory(d);
      else if (k === "announcements") setAnnouncements(d);
      else if (k === "slas") setSlas(d);
      else if (k === "leaves") setLeaves(d);
      else if (k === "leaveRequests") setLeaveRequests(d);
      else if (k === "branding") setBranding(d);
      else if (k === "pipelineRules") setPipelineRules(d);
      else if (k === "userXP") setUserXP(d);
      else if (k === "monthlyBonus") setMonthlyBonus(d);
      else if (k === "wheelConfig") setWheelConfig(d);
      else if (k === "wheelHistory") setWheelHistory(d);
      else if (k === "penalties") setPenalties(d);
      else if (k === "penaltyConfig") setPenaltyConfig(d);
      else if (k === "taskActivity") setTaskActivity(d);
      else if (k === "leagueArchive") setLeagueArchive(d);
      else if (k === "taskEditors") setTaskEditors(d);
      // errorLog, taskBackups, cloud_taskBackups intentionally not mirrored to React state — they're admin/operational
      // Update shadow ref so the resulting useEffect doesn't re-emit the same write
      _shadowBlobs.current[k] = d;
      return;
    }
    if (ev.type === "full_resync") {
      _applyBootstrap(ev.bootstrap);
    }
  });
  return function() { unsubChange(); };
}, []);
```

NOTE: this needs a complete `if/else if` chain for ALL 38 blob keys. The implementer subagent MUST include every blob key from the allow-list. Cross-reference Task 6's `ALLOWED_BLOB_KEYS`.

- [ ] **Step 7: Disable the Supabase Realtime subscription when USE_API**

Find the `useEffect` around line 1042 that does `supabase.channel("app_data_changes")`. Add an early return:

```js
useEffect(function() {
  if (USE_API) return; // SSE handles realtime
  var channel = supabase.channel(...).on(...).subscribe();
  return function() { supabase.removeChannel(channel); };
}, []);
```

- [ ] **Step 8: Special-case the sessions heartbeat**

The existing sessions heartbeat (around line 1802) calls `setSessions(p => ({...p, [user]: ts()}))` every 30 seconds. With saveBlob, every tab writing the whole sessions blob is exactly today's bug (Carla overwrites Dana's ping). Replace it with a direct `patchBlob`:

Old (around line 1802):
```js
useEffect(function() {
  if (!user) return;
  var fn = function() {
    setSessions(function(p) { var n = Object.assign({}, p); n[user] = ts(); return n; });
  };
  fn();
  var iv = setInterval(fn, 30000);
  return function() { clearInterval(iv); };
}, [user]);
```

New:
```js
useEffect(function() {
  if (!user) return;
  var fn = function() {
    if (USE_API) {
      // Server-side PATCH: only my own field gets touched. No more stomping other users.
      API.patchBlob("sessions", { op: "set_field", path: [user], value: ts() });
      // Also reflect locally so the UI shows ourselves "active"
      setSessions(function(p) { var n = Object.assign({}, p); n[user] = ts(); return n; });
      // Mark shadow so the resulting useEffect doesn't re-PUT the whole blob
      _shadowBlobs.current["sessions"] = Object.assign({}, _shadowBlobs.current["sessions"] || sessionsRef.current || {}, { [user]: ts() });
    } else {
      setSessions(function(p) { var n = Object.assign({}, p); n[user] = ts(); return n; });
    }
  };
  fn();
  var iv = setInterval(fn, 30000);
  return function() { clearInterval(iv); };
}, [user]);
```

(`sessionsRef` is an existing ref or, if it doesn't exist, replace the fallback with `{}` — the shadow is best-effort.)

- [ ] **Step 9: Verify build**

```bash
cd /Users/bogdanpeltea/Desktop/scout-task-manager && npx vite build 2>&1 | tail -5
```

Expected: success.

- [ ] **Step 10: Commit**

```bash
git add src/App.jsx && git commit -m "Frontend: wire src/api.js into App.jsx behind USE_API flag"
```

---

## Task 13: Save-status UI pill + offline banner

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: Add the global save-status UI component**

Inside the main App render JSX, near the top of the return (next to `<ToastBanner>`), add:

```jsx
{USE_API && <SaveStatusPill />}
```

Define the component near the top of App.jsx (module-level, NOT inside App):

```js
function SaveStatusPill() {
  var [s, setS] = useState(API.getStatus());
  useEffect(function() {
    return API.onStatus(setS);
  }, []);
  if (s.state === "synced") {
    return <div style={{ position: "fixed", bottom: 12, right: 12, padding: "6px 12px", background: "#10B981", color: "#fff", borderRadius: 999, fontSize: 11, fontWeight: 700, zIndex: 9999 }}>✓ Sincronizat</div>;
  }
  if (s.state === "saving") {
    return <div style={{ position: "fixed", bottom: 12, right: 12, padding: "6px 12px", background: "#94A3B8", color: "#fff", borderRadius: 999, fontSize: 11, fontWeight: 700, zIndex: 9999 }}>⏳ Se salveaza... ({s.queueLen})</div>;
  }
  if (s.state === "offline") {
    return <>
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, padding: "10px 16px", background: "#DC2626", color: "#fff", textAlign: "center", fontSize: 13, fontWeight: 700, zIndex: 99999 }}>
        ⚠️ Conectare pierduta. Modificarile NU se salveaza. Reincarca pagina (Cmd+Shift+R).
      </div>
      <div style={{ position: "fixed", bottom: 12, right: 12, padding: "6px 12px", background: "#DC2626", color: "#fff", borderRadius: 999, fontSize: 11, fontWeight: 700, zIndex: 9999 }}>✗ Offline</div>
    </>;
  }
  return <div style={{ position: "fixed", bottom: 12, right: 12, padding: "6px 12px", background: "#F59E0B", color: "#fff", borderRadius: 999, fontSize: 11, fontWeight: 700, zIndex: 9999 }}>⚠️ Eroare salvare</div>;
}
```

- [ ] **Step 2: Verify build**

```bash
cd /Users/bogdanpeltea/Desktop/scout-task-manager && npx vite build 2>&1 | tail -3
```

- [ ] **Step 3: Commit**

```bash
git add src/App.jsx && git commit -m "Frontend: save-status pill + offline banner"
```

---

## Task 14: Local smoke test (Vite dev server)

**Files:** none.

- [ ] **Step 1: Set up tunnel for local dev → remote API**

The local Vite dev server runs at `http://localhost:5173`. Its `/api/*` requests need to hit `https://34-62-56-73.nip.io/api/*`. Add a Vite proxy.

Edit `vite.config.js`:

```js
export default defineConfig({
  // ...existing...
  server: {
    proxy: {
      "/api": {
        target: "https://34-62-56-73.nip.io",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
```

- [ ] **Step 2: Start dev server**

```bash
cd /Users/bogdanpeltea/Desktop/scout-task-manager && npm run dev
```

In a browser: open `http://localhost:5173`, log in as `bogdan / bogdan2026`, verify:
- "✓ Sincronizat" pill appears bottom-right
- Tasks load (the world)
- Creating a new task shows the pill flip to "⏳ Se salveaza..." then back to "✓"
- Opening DevTools → Network → confirm `/api/bootstrap`, `/api/events`, `/api/heartbeat` requests
- Disable network in DevTools → red banner appears within ~90s

- [ ] **Step 3: Commit the vite.config change**

```bash
git add vite.config.js && git commit -m "vite: proxy /api to scout-tasks for local dev"
```

---

## Task 15: Cutover — trigger auto-reload via `_forceRefresh`

**Files:** none (production action).

- [ ] **Step 1: Flip the feature flag**

Edit `src/App.jsx` and change `var USE_API = false;` to `var USE_API = true;`. Commit:

```bash
cd /Users/bogdanpeltea/Desktop/scout-task-manager
sed -i.bak 's/var USE_API = false;/var USE_API = true;/' src/App.jsx
rm src/App.jsx.bak
git add src/App.jsx && git commit -m "Cutover: flip USE_API to true"
git push origin main
```

Wait ~2 min for Vercel to build + deploy.

- [ ] **Step 2: Verify new bundle is live**

```bash
curl -sS https://work-heyads.ro/ | grep -oE 'index-[A-Za-z0-9_-]+\.js' | head -1
```

Expected: new hash (different from current).

- [ ] **Step 3: Confirm the new bundle uses the new API**

```bash
NEW_HASH=$(curl -sS https://work-heyads.ro/ | grep -oE 'index-[A-Za-z0-9_-]+\.js' | head -1)
curl -sS "https://work-heyads.ro/assets/$NEW_HASH" | grep -c "API.login\|/api/bootstrap\|USE_API"
```

Expected: positive count (the API code is bundled).

- [ ] **Step 4: Trigger auto-reload for currently-open tabs**

Write a `_forceRefresh` row to Supabase. This uses the existing PostgREST endpoint that the OLD bundle still listens to via Supabase Realtime:

```bash
ANON="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzc5MDg4MzIwLCJleHAiOjE5MzY3NjgzMjB9.056KX70qmlxhlDh0W_jm6R4mbdoLb2gk_qqaf39GROU"
curl -sS -X POST "https://34-62-56-73.nip.io/rest/v1/app_data?on_conflict=id" \
  -H "apikey: $ANON" -H "Authorization: Bearer $ANON" \
  -H "Content-Type: application/json" -H "Prefer: resolution=merge-duplicates" \
  -d "{\"id\":\"_forceRefresh\",\"data\":{\"at\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"by\":\"deploy-scout-api\"}}"
```

Expected: empty/success response. Within 5 seconds, every open browser tab on the old bundle shows the toast and reloads.

- [ ] **Step 5: Monitor**

```bash
gcloud compute ssh scout-tasks --zone=europe-west1-b --command="docker logs --tail 50 scout-api"
```

Look for `/api/login` requests and `/api/bootstrap` requests. Each user should appear within a minute or two as they reload.

Also:

```bash
curl -sS https://34-62-56-73.nip.io/api/healthz
```

Watch `clients` (SSE connections) grow as users come online.

- [ ] **Step 6: Verify a representative user end-to-end**

Have Bogdan log in as Carla (or test on a clean browser) and confirm:
- Login works
- Tasks load
- Create a task → instant ✓ Sincronizat pill
- Open the existing Concedii page → it shows the team calendar
- All Echipa pages (Workload, League, etc.) work

If anything is broken, **flip the USE_API flag back to false** in `src/App.jsx`, push, trigger another `_forceRefresh`. We're back on the legacy path.

- [ ] **Step 7: Commit anything from monitoring**

(nothing usually — this is observability.)

---

## Task 16: Post-cutover cleanup

- [ ] **Step 1: Wait 24 hours**

Confirm no `error_log` entries from new users. Confirm no support tickets.

- [ ] **Step 2: Remove the legacy code paths (optional, can stay another week)**

Once stable, in a follow-up commit delete:
- `cloudSave`, `cloudLoad`, `_cloudLoadAllTasks`, `_cloudSaveTasksPerRow`, `_cloudSaveTasksMergeLegacy` from `App.jsx`.
- The `supabase.channel(...)` realtime subscription.
- The `_pendingKeys`/`saveTimers`/`_saveVersions` plumbing.

For now leave them in place behind `if (!USE_API)` for rollback ability.

- [ ] **Step 3: Disable PostgREST + Realtime (only after 1 week of stability)**

```bash
gcloud compute ssh scout-tasks --zone=europe-west1-b --command="cd /home/bogdan/supabase/docker && sudo docker compose stop rest realtime kong gotrue studio"
```

Free ~200 MB RAM. Postgres + scout-api keep running.

- [ ] **Step 4: Update memory**

Add a memory note: API migration complete on YYYY-MM-DD.

---

## Out of scope (do NOT add to this plan)

- Password hashing (follow-up).
- Per-user RLS (follow-up).
- Mobile app.
- Multi-region deploy.
- Replacing the entire UI framework.
