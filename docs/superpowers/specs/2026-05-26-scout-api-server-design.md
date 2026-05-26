# Scout API Server — Architectural Rebuild

**Status:** Draft (2026-05-26)
**Author:** Bogdan + Claude
**Trigger:** Today's outage. Carla's 4-day-stale tab silently overwrote shared state. Dana saw no tasks. The browser-as-database architecture has reached its limit at 10 users.

## Goal

Eliminate the entire class of bugs caused by "browser is the truth." Put a small server in front of the database, make every write go through it, version every row to reject stale writes, push changes via auto-reconnecting SSE.

## Non-goals (v1)

- Rewriting the React app. The 9k-line `App.jsx` stays. We swap the data layer underneath it.
- Replacing the database. Postgres + the `app_data` table stay.
- Migrating data. Existing rows are unchanged; a `version` column is added.
- Multi-region / HA.
- Removing Supabase self-host entirely yet. We keep it running during cutover, then disable PostgREST and Realtime.
- Password reset flows, OAuth, MFA. Auth keeps the existing plaintext-password model for now, just moves the comparison server-side and issues sessions. (Hashing is a follow-up.)

## What lives where today

Current stack on the GCP VM `scout-tasks` (europe-west1-b, e2-medium, 3.8 GB RAM, 614 MB free):

- Postgres 15 (Docker, port 5432 internal)
- PostgREST (Docker, behind Kong on port 80/443 via nginx)
- Realtime (Docker, WebSocket on port 4000 internal)
- nginx (host, terminates TLS at `34-62-56-73.nip.io`)
- GoTrue, Studio, Kong (Docker, mostly unused but part of the supabase self-host stack)
- No Node runtime installed on the host. Docker available.

The browser uses `supabase-js` (and raw `fetch` for tasks) to talk directly to PostgREST + Realtime. All 36 keys persist as either one blob row in `app_data` or per-row `task_<id>` rows.

## What we ship

A new container, **`scout-api`**, running on the same VM in the same Docker network. Browser stops talking to PostgREST and Realtime; talks only to `scout-api` via nginx-proxied `/api/*`.

```
Browser ──HTTPS──> nginx ──> scout-api ──> Postgres
                                  │
                                  └── SSE channel back to browsers
```

Postgres stays. PostgREST stays running but is no longer reached from outside (we leave it up only as a safety net for the cutover week; then disabled).

### Tech choices

- **Node 22 LTS** in a slim Alpine container (`node:22-alpine`).
- **Fastify** (lighter than Express, ~30 MB footprint, native JSON validation). Express would also work; Fastify gives us schema validation and structured logging for free.
- **`pg`** (node-postgres) for direct Postgres access — connect to the existing `db` container on the internal Docker network. Bypasses PostgREST entirely on the server side.
- **`bcrypt`** for password hashing on the optional follow-up; v1 ships with plaintext compare to match current behavior.
- **`jose`** for JWT signing/verification (HS256 with a fresh `SCOUT_API_JWT_SECRET`).
- **SSE** for realtime push (no library — native `EventSource` in browser, manual `res.write('data: ...\n\n')` on server).

Memory footprint estimate: ~80 MB resident for Fastify + pg pool. Headroom on the VM is tight (614 MB free) but adequate. We can drop GoTrue + Studio later to free ~200 MB.

### Database changes

Single migration on the existing `app_data` table:

```sql
ALTER TABLE app_data ADD COLUMN version BIGINT NOT NULL DEFAULT 1;
ALTER TABLE app_data ADD COLUMN updated_by TEXT;
CREATE INDEX IF NOT EXISTS app_data_version_idx ON app_data (id, version);
```

Every existing row gets `version = 1` and `updated_by = NULL`. No data migration required beyond that.

**Blob keys covered (full list from audit):**
`team`, `tasks` (legacy blob, no longer written), `logs`, `sessions`, `shops`, `products`, `timers`, `templates`, `targets`, `sheets`, `notifs`, `taskTypes`, `departments`, `platforms`, `loginTrack`, `recurringTasks`, `statusHistory`, `productAudit`, `allTags`, `achievements`, `dailyChallenge`, `loginHistory`, `announcements`, `slas`, `leaves`, `leaveRequests`, `branding`, `pipelineRules`, `userXP`, `monthlyBonus`, `wheelConfig`, `wheelHistory`, `penalties`, `penaltyConfig`, `taskActivity`, `leagueArchive`, `taskEditors`, `errorLog`, `taskBackups`, `cloud_taskBackups`.

The legacy `tasks` blob row and `tasks_archive` row are preserved as historical artifacts; the new API never writes to them. They become deprecated.

## Authentication

### Login

`POST /api/login`

Body: `{ username, password }`.

Server reads the `team` blob row, finds the user, compares password (plaintext for now, bcrypt in follow-up). If match, signs a JWT:

```json
{
  "sub": "carla",
  "role": "pm",
  "iat": <unix>,
  "exp": <unix + 12h>,
  "tabId": "<uuid>"
}
```

JWT is signed with `SCOUT_API_JWT_SECRET` (a new env var, generated at deploy time, stored only in the API container). The JWT has NO `tabId` claim — that comes from the client header (see "Tab identity" below). Returned as `{ token, user: {…public fields…} }`.

Browser stores the token in `localStorage.s7_token`. Every subsequent request includes `Authorization: Bearer <token>` AND `X-Scout-Tab-Id: <uuid>`.

### Authorization

Every endpoint validates the token. Endpoints check `role` against allowed roles (admin/pm/member) where relevant. No RLS-style policies at the DB layer — auth is enforced 100% in the API service.

### Tab identity

Each browser tab generates a `tabId` UUID at page load (kept in `sessionStorage` so it survives F5 but not new tabs). Sent on every request as `X-Scout-Tab-Id: <uuid>` and on the SSE connection as a query parameter `?tab=<uuid>`. The API stamps every write with the tabId and includes it in the broadcast event. Tabs ignore events where `event.tabId === ownTabId` (no self-echo). This is intentionally NOT in the JWT — tabId changes per tab, JWT changes per login.

## Versioned writes

Every row in `app_data` carries a `version` integer. Every write request must include the version the client thinks it's updating from. The server runs:

```sql
UPDATE app_data
   SET data = $1, version = version + 1, updated_at = now(), updated_by = $2
 WHERE id = $3 AND version = $4
 RETURNING version;
```

- If `RETURNING` is non-empty → success, returns the new version.
- If empty → either row doesn't exist or version mismatch → API returns `409 Conflict` with the body `{currentVersion, currentData}` so the client can recover without an extra round-trip.

**First-write-after-migration handling:** the migration sets all rows to `version = 1`. After deploy, the first browser that connects has no cached version. The `/api/bootstrap` response includes the current version of every row, so the client immediately knows the right version to send on its next write. No special-casing needed in the API — the migration is "version 1 is the starting point" and bootstrap surfaces it.

**Creating a new row:** `PUT /api/blob/:key` with `version: 0` is interpreted as "insert if not exists." Server does `INSERT ... ON CONFLICT DO NOTHING RETURNING version`; if the row already exists, returns 409 with the current version.

Browser handler on 409:
1. Replace local state with the server's current copy (last-write-wins is replaced with "server wins on conflict").
2. Show a toast: "Cineva a modificat acest task între timp — am preluat ultima versiune. Verifică și salvează din nou dacă e necesar."
3. Do NOT silently retry — the user must re-confirm if it was a meaningful conflict.

**Net effect:** Carla's stale tab from May 22 cannot overwrite Dana's May 26 state. The very first write she attempts will get 409 → her tab pulls fresh state → she sees the correct world.

### Tasks (per-row writes)

Per-task `task_<id>` rows have their own version each. Writes go through:

- `POST   /api/tasks` — create. **Client-generated id is the norm** (current code uses `gid()`); server accepts the supplied id and inserts with version 1. If body omits id, server generates one.
- `PUT    /api/tasks/:id` — full update. Body includes `version` of the row being updated.
- `PATCH  /api/tasks/:id` — partial update for specific fields (e.g. just status). Body includes `version`. Returns new version.
- `DELETE /api/tasks/:id` — soft delete (sets `data->>'_deleted' = true`). Body includes `version`. A background sweep job inside the API container hard-deletes rows where `_deleted = true` and `updated_at < now() - interval '7 days'` (runs once daily at 04:00).

### Blob writes

For the 35 blob keys (`team`, `pipelineRules`, etc.):

- `PUT /api/blob/:key` — full replace. Body: `{ data, version }`. Returns new version.
- `PATCH /api/blob/:key` — server-side merge for "additive" operations like appending a log entry, marking a notification read, adding a leave date. Body: `{ op, ... }` where `op` is one of a small whitelist (`append`, `set_field`, `delete_field`). Returns new version.

Reasoning for PATCH: today's debounced "save the whole blob" pattern is racy by design — Carla writes whole `sessions` blob, stomping Dana's recent ping. With PATCH, Carla's tab would call `PATCH /api/blob/sessions {op: "set_field", path: ["carla"], value: ts()}` — server only touches the `carla` field. Dana's heartbeat is untouched.

**PATCH op vocabulary** (small, fixed whitelist — easy to reason about):

| op | args | semantics |
|---|---|---|
| `set_field` | `path: [...], value` | `data.path = value`. Creates intermediate objects. |
| `delete_field` | `path: [...]` | Deletes the key at path. |
| `array_append` | `path: [...], value, max?` | Pushes value to array at path. If `max` set, trims to last `max` items. Used for logs, notifs, loginHistory. |
| `array_remove` | `path: [...], where: {field, eq}` | Removes array items where `item[field] === eq`. Used to mark notifications read. |
| `array_update` | `path: [...], where: {field, eq}, patch: {...}` | Updates array items matching `where`, shallow-merging `patch`. |

PATCH operations run server-side inside a single transaction with the version check. The server returns `{version, data}` so the client refreshes its local state with the merged result. PATCH is **idempotent within a single request but NOT across retries** — clients must not blindly retry a 5xx-failed PATCH; on transient failure, refetch the row and re-apply.

We implement PATCH for the high-contention blobs first: `sessions`, `notifs`, `taskActivity`, `logs`, `loginHistory`, `loginTrack`. Other blobs stay on PUT for v1 (they're written rarely enough that a 409 round-trip is fine).

## Realtime via SSE

`GET /api/events` — long-lived HTTP connection, content-type `text/event-stream`. Browser uses native `EventSource`. Auto-reconnects on disconnect (this is the bug-fix vs. Supabase's WebSocket that silently dies).

Server keeps a `Set<{ uid, tabId, res }>` of connected clients. On every successful write, pushes:

```
event: row_change
data: { "id": "task_abc123", "version": 47, "data": {...}, "by": "carla", "tabId": "xxx" }
```

Clients ignore events where `tabId === ownTabId` (no self-echo).

### Reconnect-safe replay

EventSource auto-reconnects on disconnect. The browser sends the standard `Last-Event-ID: <n>` header (we set each event's `id:` field to a monotonically increasing integer). Server keeps an in-memory ring buffer of the last 5000 events (~2.5 MB at ~500B each). On reconnect:

- If `Last-Event-ID` is within the buffer: server replays all events with `id > Last-Event-ID` and then continues with live events.
- If `Last-Event-ID` is older than the oldest entry in the buffer (or the buffer was cleared by an API restart): server emits `event: full_resync\ndata: {}` as the first event and the client refetches via `GET /api/bootstrap`.
- If the client has no `Last-Event-ID` yet (fresh connection after page load): server emits `event: hello\ndata: {lastEventId: <current>}` and the client treats its already-loaded bootstrap as authoritative.

This means: tab goes to sleep for 4 hours, wakes up → EventSource auto-reconnects → server says `full_resync` → tab calls bootstrap → back in sync. No more stale tabs.

### Server restart handling

When `scout-api` restarts, the ring buffer is lost. All connected clients reconnect, get `full_resync`, refetch bootstrap. This is fine: a restart should happen <1× per week. The single-event resync flood is bounded by client count (10 users × one bootstrap each = 10 requests).

## Heartbeat & stale-tab detection

`POST /api/heartbeat` every 30 seconds. Body empty, headers contain JWT. Server updates an in-memory `userLastSeen` map. Browser tracks the response time.

If the browser fails 3 heartbeats in a row, it shows a **red banner across the top**:

> ⚠️ Conectare pierduta. Modificările tale nu se salvează. Reincarca pagina (Cmd+Shift+R).

This is the single most important user-visible fix: Carla's tab on May 22 would have shown this banner within 90 seconds of going stale. She would have refreshed instead of "working" for 4 days against a dead tab.

## Save status indicator

A small status pill in the bottom-right of the UI, always visible:

- ✓ Synced (green, default)
- ⏳ Saving... (gray, during in-flight writes)
- ⚠️ 1 modificare nesalvata (orange, retry queue has items)
- ✗ Offline (red, no heartbeat ack)

Powered by a tiny global state listener. Tasks pile into a retry queue if offline; when the heartbeat recovers, queue drains.

## API surface (complete)

```
# Auth
POST   /api/login              body: {username, password}    → {token, user}
POST   /api/logout             → {}
GET    /api/me                 → {user}
POST   /api/heartbeat          → {serverTime}

# Tasks (per-row)
GET    /api/tasks              → [{id, data, version}, ...]
POST   /api/tasks              body: {data}                  → {id, version}
PUT    /api/tasks/:id          body: {data, version}         → {version}
PATCH  /api/tasks/:id          body: {patch, version}        → {version}
DELETE /api/tasks/:id          body: {version}               → {ok:true}

# Blobs (other keys)
GET    /api/blob/:key          → {data, version}
PUT    /api/blob/:key          body: {data, version}         → {version}
PATCH  /api/blob/:key          body: {op, args, version}     → {version, data}

# Bulk loaders
GET    /api/bootstrap          → {
                                   tasks: [{id, data, version}, ...],
                                   blobs: {team: {data, version}, pipelineRules: {data, version}, ...},
                                   serverTime: "<ISO>",       // for clock sync (replaces today's HEAD trick)
                                   lastEventId: <int>         // current SSE event id; client uses this to ignore replay of events it just processed in bootstrap
                                 }
                                 # Single call returns the world for fast page-load.
                                 # ~3 MB JSON at current data volume (3000 tasks × ~1 KB + 35 blobs).
                                 # gzip'd over the wire: ~400 KB.

# Realtime
GET    /api/events?tab=<uuid>  SSE stream, replay via Last-Event-ID

# Admin (role=admin only)
POST   /api/admin/force-refresh                              → {at}
                                 # broadcasts SSE `event: refresh` to all clients;
                                 # clients show toast + reload after 5s (matches today's UX).
GET    /api/admin/healthcheck                                → {db, sse, clients, latency, memMB}
```

All endpoints (except `/api/login`) require valid JWT.

## Frontend changes (`src/App.jsx`)

Replace the data layer. The 36 `useState` slots and their `useEffect`-driven saves get rewired to a new module:

```js
// New: src/api.js
const API = "/api";
let _token = localStorage.getItem("s7_token");
let _tabId = crypto.randomUUID();
let _lastEventId = null;
let _versions = {};   // {rowId: version}

async function apiFetch(path, opts={}) { ... }   // attaches token, handles 401/409
function openEventStream() { ... }                // EventSource with reconnect
function bootstrap() { ... }                      // GET /api/bootstrap, populate state
function saveBlob(key, data) { ... }              // PUT with version, retries on net err, gives up on 409
function saveTaskPatch(id, patch) { ... }         // PATCH
// ... etc.
```

The existing `cloudSave`, `cloudLoad`, `_cloudSaveTasksPerRow`, `_cloudLoadAllTasks`, `debouncedSave`, `immediateSave`, the realtime channel, and the anti-echo logic **all get deleted**. Replaced by ~400 lines of new code in `api.js`.

The 9k-line UI code is untouched except for swapping `cloudSave("foo", ...)` → `api.saveBlob("foo", ...)` and `_cloudSaveTasksPerRow(...)` → `api.saveTasks(...)`.

### Retry queue & offline behavior

The new `api.js` maintains a small in-memory write queue:

- Every write attempt is added to the queue with `{op, payload, retries: 0}`.
- On network failure (no HTTP response), it stays in the queue and the heartbeat loop retries it on the next 30 s tick.
- On 409 conflict, the write is dropped from the queue and the row's local state is replaced with the server's `currentData`. The user sees a toast.
- On 5xx, retry up to 3 times with exponential backoff (1 s, 4 s, 16 s), then drop and surface an error.
- On 401, wipe token + reload.
- Queue is **NOT persisted** to localStorage. If the browser is closed with pending writes, those are lost. This is by design — persisting them would let stale writes survive into a new session and re-create today's bug class.

### localStorage usage in the new world

- `s7_token` — JWT, persisted across reloads.
- `s7_bootstrap_cache` — last successful bootstrap response, persisted across reloads. On next page load, the UI hydrates from this cache **for instant first paint**, then calls `/api/bootstrap` in the background and replaces state. If the API is unreachable, the cached state stays but the offline banner shows. (This is the only role localStorage plays — no more per-key writeback.)
- `s7_user` (current key for legacy session restoration) — removed; replaced by the JWT.
- All other `s7_*` keys (`s7_tasks`, `s7_team`, ...) — removed by the new code on first load.

### Force-refresh path

`localStorage.s7_token` becomes the only persisted identity. On 401 from any endpoint, browser wipes token + reloads. On `full_resync` SSE event, browser refetches via `/api/bootstrap`. No more `_forceRefresh` blob row.

## Deployment

### Container

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY src/ ./src/
ENV NODE_ENV=production
EXPOSE 3030
CMD ["node", "src/index.js"]
```

Image size estimate: ~150 MB. Runs as a sidecar to the existing supabase stack on the same docker-compose network.

### docker-compose addition

```yaml
scout-api:
  build: ./scout-api
  container_name: scout-api
  restart: unless-stopped
  environment:
    POSTGRES_URL: postgres://postgres:${POSTGRES_PASSWORD}@db:5432/postgres
    JWT_SECRET: ${SCOUT_API_JWT_SECRET}
    NODE_ENV: production
  depends_on:
    - db
  networks:
    - default
  ports:
    - "127.0.0.1:3030:3030"   # only exposed to localhost; nginx proxies
```

### nginx

Add to `/etc/nginx/sites-available/scout-tasks`:

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:3030;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    proxy_set_header Host $host;
    proxy_read_timeout 3600s;   # for SSE
    proxy_buffering off;        # for SSE
}
```

`/rest/v1/*` and `/realtime/v1/*` (existing Supabase paths) stay reachable during cutover but become unused after the frontend switches.

### Secret management

`SCOUT_API_JWT_SECRET` generated once at deploy:

```bash
openssl rand -hex 32 > /home/bogdan/secrets/scout_api_jwt_secret
```

Read into `.env` at the docker-compose root. Same pattern as the existing Supabase secrets.

### Logging

Fastify logs to stdout (JSON). Captured by Docker. Rotated via Docker's default `json-file` driver with `max-size=10m, max-file=3`.

### Monitoring

Simple health endpoint `/api/admin/healthcheck` returns:
- DB ping latency
- Number of connected SSE clients
- Uptime
- Memory usage

Bogdan can curl this from the existing admin Error Log page (extend it with a new diagnostic).

## Migration / cutover plan

### Phase 1 (day 1): Server stands up, frontend unchanged

- Deploy `scout-api` container.
- Run DB migration (add `version` column).
- Verify `/api/bootstrap` returns the world, `/api/events` streams.
- Frontend continues using direct PostgREST. Nothing user-visible changes.

### Phase 2 (day 2): Dual-mode frontend behind a feature flag

- Push frontend update with `USE_API = false` constant.
- Manually test by setting `USE_API = true` in DevTools console for one user (Bogdan).
- Verify everything works via the API.

### Phase 3 (day 3): Switch flag to true for everyone

- Flip `USE_API = true`, push to main, Vercel rebuilds.
- **Trigger auto-reload via the existing `_forceRefresh` mechanism:** write a row to `app_data` with `id="_forceRefresh"`, `data={at: now, by: "deploy"}`. Old browsers (still on Supabase Realtime) receive the postgres_changes event, show toast "Aplicatia se actualizeaza in 5 secunde…", reload after 5 s, fetch the new bundle from Vercel, and come up on the new API. **No user action required.**
- Monitor `/api/admin/healthcheck` for 24h.
- Keep PostgREST and Supabase Realtime running as a safety net during this window.

### Phase 4 (day 4-7): Burn the bridges

- Confirm zero traffic to PostgREST and Realtime (nginx logs).
- Block direct access to `/rest/v1/*` and `/realtime/v1/*` at nginx.
- Optionally remove GoTrue, Studio, Kong from docker-compose (frees ~200 MB).

Rollback: if the API has a fatal bug at any phase, flip `USE_API = false` and redeploy frontend. PostgREST + Realtime remain functional.

## Risks & mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Memory exhaustion on the e2-medium (3.8 GB, 614 MB free) | Medium | Fastify is lean (~80 MB). If we run tight, drop GoTrue + Studio (~200 MB) or upgrade to e2-standard-2. Monitor first. |
| pg connection pool exhausts under load | Low | 10 users × ~3 req/s peak = 30 req/s. Pool size 10 with 5s idle timeout is plenty. |
| SSE breaks behind some corporate proxy | Low | Native EventSource has very wide support. nginx is already configured for WebSocket upgrades; SSE is plain HTTP and simpler. |
| Conflict (409) noise annoys users | Medium | Only fires when a real race happens. Today's pattern is `set whole sessions blob` which races constantly. After switching to PATCH for high-contention blobs, conflicts go to ~zero. |
| The big frontend rewrite introduces regressions | High | Mitigated by the feature flag. Both paths exist in code during cutover. Can flip back instantly. |
| Tasks lose pipeline behavior in the switch | Medium | The pipeline rules engine stays where it is (client-side, in `executePipelineRules`). The API layer doesn't touch pipeline logic. We just replace the persistence call. |
| Existing Supabase Realtime echoes confuse the new SSE | Low | Frontend stops subscribing to Realtime when `USE_API = true`. Realtime keeps running but has no clients. |
| Auth token theft via XSS | Existing risk | Token in localStorage is no worse than today's plaintext password + hardcoded anon JWT. Bcrypt + HttpOnly cookies are a follow-up. |

## Success criteria

- A 4-day-stale tab cannot write any task or blob. First write attempt returns 409 → tab refreshes → matches DB.
- Every write returns success or failure within 300 ms (p95). No silent failures.
- The "✓ Synced" pill is visible on every screen.
- A tab going stale (3 missed heartbeats) shows the red banner within 90 seconds.
- Dana sees Carla's new task within 1 second of Carla creating it (SSE push).
- A tab that sleeps overnight and wakes up resyncs via `full_resync` within 2 seconds and continues working.
- No more "Carla creates task, Dana doesn't see it" tickets.
- VM memory headroom stays >300 MB free at peak load.
- Backup cron (existing) continues to dump Postgres nightly with the new schema.

## Out of scope (deferred)

- Bcrypt password hashing.
- Per-user audit log (`updated_by` column is populated, but we don't expose a UI for it yet).
- Row-level access control (members can't read admin-only blobs).
- Rate limiting per user.
- Optimistic UI for blob PATCH operations.
- Mobile apps.
- WebSocket-based realtime (SSE is sufficient and simpler).
- Postgres replicas / read-only nodes.

## Decisions

1. **Cutover:** auto-reload via existing `_forceRefresh` mechanism — no user action required. Schedule the trigger for whenever the new bundle is verified, ideally a low-traffic window but not required.
2. **VM snapshot:** YES, taken right before the DB migration. ~2 min, instant rollback.
3. **Auth:** plaintext compare server-side. Same behavior as today, just moved off the browser. No encryption. Keep it simple.
