// Scout API client. Replaces direct Supabase/PostgREST writes from App.jsx.
// Pattern: load bootstrap on mount, open EventSource, queue writes, version-check, broadcast.

// Absolute URL so the browser hits scout-api directly (CORS is configured on the API).
// Relative "/api" would route to the Vercel-hosted frontend domain, which has no /api proxy.
const API = "https://34-62-56-73.nip.io/api";
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
const statusSubscribers = new Set();
let saveStatus = { state: "synced", queueLen: 0, lastError: null };

function setStatus(patch) {
  saveStatus = { ...saveStatus, ...patch };
  for (const fn of statusSubscribers) try { fn(saveStatus); } catch {}
}
export function onStatus(fn) { statusSubscribers.add(fn); return () => statusSubscribers.delete(fn); }
export function getStatus() { return saveStatus; }

function authHeaders(hasBody) {
  const h = {
    "Authorization": "Bearer " + _token,
    "X-Scout-Tab-Id": _tabId,
  };
  // Only set Content-Type when there's actually a body — Fastify rejects empty JSON body
  // with FST_ERR_CTP_EMPTY_JSON_BODY when Content-Type: application/json is set without a body.
  if (hasBody) h["Content-Type"] = "application/json";
  return h;
}

async function apiFetch(path, opts = {}) {
  const hasBody = opts.body !== undefined && opts.body !== null;
  const r = await fetch(API + path, {
    method: opts.method || "GET",
    headers: { ...authHeaders(hasBody), ...(opts.headers || {}) },
    body: hasBody ? JSON.stringify(opts.body) : undefined,
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

// ---------- Writes with PERSISTENT retry queue ----------
// Queue is mirrored to localStorage. Jobs NEVER drop. On reload, queue resumes
// draining from where it left off. Callbacks (onAck/onConflict) are not
// persisted — they only fire when the write happens in the same session.
const QUEUE_KEY = "s7_write_queue";
const writeQueue = [];
let draining = false;

function persistQueue() {
  try {
    // Strip non-serializable callbacks before storing
    const safe = writeQueue.map((j) => ({
      rowId: j.rowId, path: j.path, method: j.method, body: j.body, retries: j.retries || 0,
    }));
    localStorage.setItem(QUEUE_KEY, JSON.stringify(safe));
  } catch {}
}

function loadPersistedQueue() {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return;
    const arr = JSON.parse(raw);
    if (Array.isArray(arr) && arr.length > 0) {
      for (const j of arr) writeQueue.push(j);
      setStatus({ queueLen: writeQueue.length, state: "saving" });
    }
  } catch {}
}

function enqueue(req) {
  writeQueue.push(req);
  persistQueue();
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
        // Version conflict: the server's row moved on. Adopt and drop this job.
        // (Conflict resolution is by-design — newer version wins.)
        const c = await r.json();
        versions[job.rowId] = c.currentVersion;
        if (job.onConflict) try { job.onConflict(c); } catch {}
        writeQueue.shift();
        persistQueue();
        continue;
      }
      if (!r.ok) {
        // Server error — keep retrying forever with capped backoff.
        job.retries = (job.retries || 0) + 1;
        persistQueue();
        const wait = Math.min(Math.pow(2, job.retries) * 500, 30000);
        await new Promise((res) => setTimeout(res, wait));
        continue;
      }
      const out = await r.json();
      if (out && typeof out.version === "number") versions[job.rowId] = out.version;
      if (job.onAck) try { job.onAck(out); } catch {}
      writeQueue.shift();
      persistQueue();
    } catch (e) {
      // Network error — keep retrying forever with capped backoff.
      job.retries = (job.retries || 0) + 1;
      persistQueue();
      const wait = Math.min(Math.pow(2, job.retries) * 500, 30000);
      await new Promise((res) => setTimeout(res, wait));
    }
  }
  draining = false;
  setStatus({ queueLen: 0, state: heartbeatOK ? "synced" : "offline" });
}

// Resume any writes that didn't get sent before the last tab closed.
export function resumePersistedWrites() {
  loadPersistedQueue();
  if (writeQueue.length > 0) drain();
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
const tickHeartbeat = async () => {
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
export function startHeartbeat() {
  if (heartbeatTimer) return;
  tickHeartbeat();
  // 10s interval — recovers from transient SSE/network blips in ~10s instead of 30s
  heartbeatTimer = setInterval(tickHeartbeat, 10000);
  // Trigger immediate recovery when the tab/network returns
  const wakeup = () => { tickHeartbeat(); openEvents(); };
  window.addEventListener("online", wakeup);
  window.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") wakeup(); });
}

// ---------- SSE ----------
let eventStream = null;
let lastEventId = 0;
const eventHandlers = new Set();

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
      if (data.id) versions[data.id] = data.version;
      for (const fn of eventHandlers) try { fn(data); } catch {}
    } catch {}
  };
  eventStream.addEventListener("blob_change", handleChange);
  eventStream.addEventListener("task_change", handleChange);
  eventStream.addEventListener("refresh", (ev) => {
    const last = localStorage.getItem("s7_lastForceRefresh");
    let at = "";
    try { at = JSON.parse(ev.data).at; } catch {}
    if (last === at) return;
    if (at) localStorage.setItem("s7_lastForceRefresh", at);
    setTimeout(() => window.location.reload(), 5000);
  });
  eventStream.addEventListener("full_resync", async () => {
    const fresh = await bootstrap();
    for (const fn of eventHandlers) try { fn({ type: "full_resync", bootstrap: fresh }); } catch {}
  });
  eventStream.onerror = () => {
    setStatus({ state: "offline" });
  };
  eventStream.onopen = () => {
    if (writeQueue.length === 0) setStatus({ state: "synced" });
  };
}

export function closeEvents() { if (eventStream) eventStream.close(); eventStream = null; }

export function tabId() { return _tabId; }
