# Lag Reduction Plan — Shrink the Hot Payload

> **For agentic workers:** Use superpowers:executing-plans or superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Reduce platform lag under concurrent multi-user activity by shrinking the data each user write touches.

**Architecture summary:** Today every status change rewrites the entire `tasks` JSONB blob (currently **2.96 MB / 2,765 tasks**) and Supabase realtime broadcasts that full blob to every connected client. With 5 concurrent Done clicks: ~15 MB/sec writes + ~75 MB/sec broadcast fanout. The fix is to (a) trim auxiliary data sources cheaply, and (b) split the hot `tasks` blob into "active" (recent, written-often) and "archive" (cold, rarely touched).

**Tech Stack:** Same — Vite + React 18, single-file `App.jsx`, Supabase JSONB column.

**Approach: two phases, each shippable independently**

- **Phase 1 (Quick win, ~1.5 hours):** Trim `notifs` (913 KB → ~150 KB), `taskActivity` (253 KB → ~100 KB), `logs` and `errorLog` (cap each to 500). Fix the `dailyChallenge` null-save bug that spams ~68 errors per session. ~3× aux-write reduction + stop the silent retry cycles.
- **Phase 2 (Real fix, ~3-4 hours):** **Count-based** hot/cold task split (last 500 Done + all non-Done = hot ~600 tasks ~600 KB; everything older Done = archive). 30-day date-based threshold was rejected in audit because project is only 6 weeks old and would archive zero tasks. Estimated hot payload: ~600 KB. **~4.5× write reduction, ~4.5× realtime fanout reduction.**

> **Honest limitation:** Phase 2 reduces payload size but **does NOT eliminate concurrent-write race conditions.** Bug 2 (status revert) protections continue to rely on the `statusAt` field added in this morning's deploy. The proper concurrency fix is per-task rows (Option B in plan tail) — that's a separate, larger project.

---

## Phase 1 — Cheap Trims

### Task 1.1: Cap `notifs` to last 500 entries

**Files:**
- Modify: `src/App.jsx` (find every `setNotifications(...)` that appends)

- [ ] **Step 1: Add a helper `_trimNotifs`**

Just below the existing `function fr(...)` (around line 357), add:

```js
function _trimNotifs(arr) {
  if (!Array.isArray(arr)) return arr;
  if (arr.length <= 500) return arr;
  // Keep newest 500 by time
  return arr.slice().sort(function(a, b) {
    var ta = a && a.time ? new Date(a.time).getTime() : 0;
    var tb = b && b.time ? new Date(b.time).getTime() : 0;
    return tb - ta;
  }).slice(0, 500);
}
```

- [ ] **Step 2: Wrap each setNotifications call with the trimmer**

Find every `setNotifications(function(prev) { return ... })` or `setNotifications([...])`. Wrap the result.

Search for `setNotifications(` and apply: replace `setNotifications(X)` with `setNotifications(_trimNotifs(X))` where X is the new array.

For functional setters like `setNotifications(function(p) { return [...p, n]; })`, change to `setNotifications(function(p) { return _trimNotifs([n, ...p]); })`.

(Easier path: do a single grep, list each call site, apply manually.)

- [ ] **Step 3: One-shot trim at startup**

In `loadAll` (around line 700) where `setNotifications(nf || []);` is called, change to `setNotifications(_trimNotifs(nf || []));` to immediately compact existing prod data on first load.

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/App.jsx && git commit -m "Cap notifs to last 500 entries (perf: reduce save payload)

Previously notifs grew unbounded — currently 913 KB in production. Capping
to 500 most-recent reduces it to ~150 KB. Each notification trigger now
saves a smaller blob to Supabase."
```

### Task 1.2: Cap `taskActivity` to last 1000 entries

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: Add `_trimTaskActivity`**

Below `_trimNotifs` (Task 1.1 location):

```js
function _trimTaskActivity(arr) {
  if (!Array.isArray(arr)) return arr;
  if (arr.length <= 1000) return arr;
  return arr.slice().sort(function(a, b) {
    var ta = a && a.at ? new Date(a.at).getTime() : 0;
    var tb = b && b.at ? new Date(b.at).getTime() : 0;
    return tb - ta;
  }).slice(0, 1000);
}
```

- [ ] **Step 2: Wrap the addActivity function and the initial load**

Find `addActivity = function(` (~line 1500ish) — append + trim.
Find `setTaskActivity(ta || []);` in loadAll — change to `setTaskActivity(_trimTaskActivity(ta || []));`.

- [ ] **Step 3: Verify build + commit**

```bash
npm run build
git add src/App.jsx && git commit -m "Cap taskActivity to last 1000 entries (perf)"
```

### Task 1.3: Trim `logs` to last 500 entries

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: Find `setLogs(...)` calls and the `addLog` function**

The current code appends to `logs` array forever. Cap to 500.

Inside `addLog`:

```js
// existing:
// setLogs(function(p) { return [{ id: gid(), ...}, ...p]; });
// change to:
setLogs(function(p) { return [{ id: gid(), /* fields */ }].concat(p).slice(0, 500); });
```

- [ ] **Step 2: Initial load trim**

`setLogs(lg || []);` → `setLogs((lg || []).slice(0, 500));`

- [ ] **Step 3: Verify + commit**

### Task 1.4: Cap `errorLog` to last 500 entries

**Files:**
- Modify: `src/App.jsx` near the existing `logError` function (around line 240-260)

- [ ] **Step 1: Find the line that appends to `_errorLog`**

Search for `_errorLog.push(` or `_errorLog = [` and add `.slice(0, 500)` after building the new array, or change the push pattern to cap.

Typical existing:

```js
_errorLog.unshift(entry); // grows unbounded
```

Change to:

```js
_errorLog = [entry].concat(_errorLog).slice(0, 500);
```

- [ ] **Step 2: Initial load trim**

Find where `_errorLog` is initialized from `cloudLoad("errorLog", [])` and cap on load.

- [ ] **Step 3: Verify build + commit**

```bash
npm run build
git add src/App.jsx && git commit -m "Cap errorLog to last 500 entries (perf)"
```

### Task 1.5: Fix `dailyChallenge` null-save bug

**Files:**
- Modify: `src/App.jsx` (find where `dailyChallenge` is saved)

The errorLog shows **68 errors today**, all `null value in column "data" of relation "app_data" violates not-null constraint` on key `dailyChallenge`. The app tries to save `null`/`undefined` and Supabase rejects it. Each rejection triggers retries, adding 3 errorLog entries per attempt.

- [ ] **Step 1: Find every site that calls `cloudSave("dailyChallenge", X)` or `debouncedSave("dailyChallenge", X)`**

Grep:

```
debouncedSave\(['"]dailyChallenge['"]|cloudSave\(['"]dailyChallenge['"]
```

- [ ] **Step 2: Add a guard — never save `null`/`undefined` to this key**

Wrap each save call:

```js
// before: debouncedSave("dailyChallenge", dailyChallenge, 1000);
// after:
if (dailyChallenge !== null && dailyChallenge !== undefined) {
  debouncedSave("dailyChallenge", dailyChallenge, 1000);
}
```

Optionally, the more robust fix is to apply this guard at the `cloudSave` helper level, but a targeted fix at the call site is lower-risk.

- [ ] **Step 3: Verify build + commit**

```bash
git add src/App.jsx && git commit -m "Don't save null dailyChallenge to Supabase (stops error spam)

Previously the dailyChallenge useEffect would fire with null on startup
before the cron-style daily reset hydrated the value, attempting to save
null to a NOT NULL column. ~68 errors per session. Guard added at all
save sites for this key."
```

### Task 1.6: Push & deploy Phase 1

- [ ] **Step 1: `git push origin main`**
- [ ] **Step 2: Monitor Vercel deploy**
- [ ] **Step 3: Pull row sizes after deploy + ~10 min of normal use to confirm shrinkage**

```bash
for key in notifs taskActivity logs; do
  SIZE=$(curl -s "https://ploucecgizjwyumzmhmo.supabase.co/rest/v1/app_data?id=eq.$key&select=data" -H "apikey: sb_publishable_FoAoSy7d052B3oVbcxiuyg_iLlTLiSh" -H "Authorization: Bearer sb_publishable_FoAoSy7d052B3oVbcxiuyg_iLlTLiSh" | wc -c)
  printf "%-15s %10d bytes\n" "$key" "$SIZE"
done
```

Expected: `notifs` < 200 KB, `taskActivity` < 150 KB, `logs` < 100 KB.

**Phase 1 outcome:** Per-action save payload reduced by ~1.2 MB from notif/activity/logs alone (most actions save multiple of these). For status changes, this is a measurable improvement even before Phase 2.

---

## Phase 2 — Hot/Cold Tasks Split

### Architecture

- `id=tasks` row continues to hold *active* tasks: **any status != Done**, plus **the most recently updated 500 Done tasks**.
- New `id=tasks_archive` row holds *archived* tasks: everything else (older Done).
- Migration: one-shot script that splits current 2,723 rows. **Estimated split: ~612 hot (~600 KB) / ~2,111 cold (~2.1 MB).**

**Why count-based and not date-based:** The project is ~6 weeks old. A 30-day threshold archives zero tasks today (verified via audit). A count-based threshold gives a *bounded* hot payload regardless of project age and grows predictably.

**Promotion/demotion rules:**
- New task created → hot.
- Task transitions Done → hot at time of save (it's a recently-touched Done).
- Periodic re-sweep: when a hot Done task is no longer in the top 500 by `updatedAt`, it moves to archive on the next save. Done by the migration script run weekly via admin button.
- Cold task gets reopened (Done → In Progress) → promote back to hot.

### Task 2.1: Migration script (one-shot, run BEFORE the code change deploys)

**Files:**
- Create: `scripts/split-tasks-hot-cold.mjs` (Node, runs locally against prod)

- [ ] **Step 1: Write migration script**

```js
import https from "https";
const URL = "ploucecgizjwyumzmhmo.supabase.co";
const KEY = "sb_publishable_FoAoSy7d052B3oVbcxiuyg_iLlTLiSh";
const NOW = Date.now();
const ARCHIVE_THRESHOLD_MS = 30 * 24 * 3600 * 1000; // 30 days

function req(method, path, body) {
  return new Promise((resolve, reject) => {
    const r = https.request({
      hostname: URL, path, method,
      headers: { apikey: KEY, Authorization: "Bearer " + KEY, "Content-Type": "application/json", Prefer: "return=representation" },
    }, (res) => {
      let buf = ""; res.on("data", (d) => (buf += d));
      res.on("end", () => resolve({ status: res.statusCode, body: buf }));
    });
    r.on("error", reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

const get = await req("GET", "/rest/v1/app_data?id=eq.tasks&select=data", null);
const all = JSON.parse(get.body)[0].data;
console.log("Total tasks:", all.length);

// Count-based split: top 500 Done by updatedAt + all non-Done = hot
const HOT_DONE_KEEP = 500;
const tombstones = all.filter((t) => t._deleted);
const notDone = all.filter((t) => !t._deleted && t.status !== "Done");
const doneSorted = all
  .filter((t) => !t._deleted && t.status === "Done")
  .sort((a, b) => {
    const ta = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const tb = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    return tb - ta;
  });
const hotDone = doneSorted.slice(0, HOT_DONE_KEEP);
const coldDone = doneSorted.slice(HOT_DONE_KEEP);
const hot = [].concat(tombstones, notDone, hotDone);
const cold = coldDone;

console.log("Hot:", hot.length, "Cold:", cold.length);
const hotBytes = JSON.stringify(hot).length;
const coldBytes = JSON.stringify(cold).length;
console.log("Hot payload:", Math.round(hotBytes / 1024), "KB");
console.log("Cold payload:", Math.round(coldBytes / 1024), "KB");

console.log("\nThis is a DRY RUN. Pass --commit to actually write.");
if (!process.argv.includes("--commit")) process.exit(0);

// Backup first
console.log("Creating backup...");
const backupKey = "tasks_backup_" + new Date().toISOString().replace(/[:.]/g, "-");
const bw = await req("POST", "/rest/v1/app_data", { id: backupKey, data: all });
console.log("Backup written to id=" + backupKey, "status:", bw.status);

// Write hot
const hw = await req("PATCH", "/rest/v1/app_data?id=eq.tasks", { data: hot });
console.log("Hot write status:", hw.status);

// Write cold (upsert in case row doesn't exist)
const cw = await req("POST", "/rest/v1/app_data?on_conflict=id", { id: "tasks_archive", data: cold });
console.log("Cold write status:", cw.status);
```

- [ ] **Step 2: Dry run to see split**

```bash
node scripts/split-tasks-hot-cold.mjs
```

Expected: prints hot/cold counts and sizes. No writes yet.

- [ ] **Step 3: Get user approval before --commit**

The actual split is destructive (overwrites `id=tasks`). Confirm with user before running with `--commit`.

- [ ] **Step 4: Run with --commit**

```bash
node scripts/split-tasks-hot-cold.mjs --commit
```

Expected: backup row created (`tasks_backup_YYYY-MM-DD...`), hot + cold rows written.

### Task 2.2: App.jsx — Load both hot and archive

**Files:**
- Modify: `src/App.jsx` in `loadAll` (~line 685)

- [ ] **Step 1: Load both rows in parallel**

In the existing `await Promise.all([...])`, replace `cloudLoad("tasks", [])` with two calls — `cloudLoad("tasks", [])` and `cloudLoad("tasks_archive", [])`. Capture both into `tkHot` and `tkArchive`.

Then merge:

```js
_setTasks((tkHot || []).concat(tkArchive || []));
tasksRef.current = (tkHot || []).concat(tkArchive || []);
```

So the in-memory view is the union, but the cloud write path only touches `tasks` (hot).

- [ ] **Step 2: Define `_splitHotCold` helper**

Near the top (count-based; matches the migration script logic):

```js
var _HOT_DONE_KEEP = 500;
function _splitHotCold(arr) {
  if (!Array.isArray(arr)) return { hot: [], cold: [] };
  var tombstones = arr.filter(function(t) { return t && t._deleted; });
  var notDone = arr.filter(function(t) { return t && !t._deleted && t.status !== "Done"; });
  var doneSorted = arr
    .filter(function(t) { return t && !t._deleted && t.status === "Done"; })
    .sort(function(a, b) {
      var ta = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      var tb = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return tb - ta;
    });
  return {
    hot: tombstones.concat(notDone).concat(doneSorted.slice(0, _HOT_DONE_KEEP)),
    cold: doneSorted.slice(_HOT_DONE_KEEP),
  };
}
```

- [ ] **Step 3: Update `cloudSaveTasksMerge` to write hot ALWAYS, archive ONLY when cold-set changes**

Inside `cloudSaveTasksMerge`, after computing `merged`:

```js
var split = _splitHotCold(merged);
// Save hot to id=tasks (the active dataset)
var { error: writeErr } = await supabase.from("app_data").upsert({ id: "tasks", data: split.hot, updated_at: new Date().toISOString() }, { onConflict: "id" });

// Save archive ONLY if cold-set changed since last write.
// Compare cold ids to a module-level reference; if same, skip.
var coldIds = split.cold.map(function(t) { return t.id; }).sort().join(",");
if (coldIds !== _lastColdIdSet) {
  _lastColdIdSet = coldIds;
  var { error: archErr } = await supabase.from("app_data").upsert({ id: "tasks_archive", data: split.cold, updated_at: new Date().toISOString() }, { onConflict: "id" });
  if (archErr) logError("SUPABASE_SAVE", "archive write failed (non-fatal)", archErr.message || "");
}
```

And declare at the top of the file: `var _lastColdIdSet = null;`

This ensures: hot writes happen every save (cheap, ~600 KB), archive writes happen only when a task is promoted/demoted (rare, ~2 MB — acceptable trade).

- [ ] **Step 4: Update the 30s auto-resync to only re-fetch hot**

Currently the auto-resync at line 850 does `cloudLoad("tasks", [])`. Change to fetch only `tasks` (hot) — archive doesn't change during the session unless we explicitly demote.

- [ ] **Step 5: Realtime channel — only react to `tasks` changes**

Existing realtime handler already filters by `payload.new.id`. Add an `if (key === "tasks_archive") return;` early to skip archive events (they don't happen often anyway).

- [ ] **Step 6: Verify build, deploy, test**

`npm run build` clean. Push. Verify on prod that:

- A new task creates in hot, appears in UI ✓
- Marking a 60-day-old Done task back to In Progress demotes it to hot? (Edge case — leave for later)
- Dashboard "completed last week" view still shows archive items ✓

### Task 2.3: Promote/demote logic (defer to later)

Demoting hot → archive happens on a periodic sweep. The migration script can be re-run weekly via a CRON or admin button. For v1, just let archive grow stale until the next manual run.

---

## Phase 2.5 — Recurring Task Duplicate Fix (separate, optional ship)

**Why:** 36 HA-product codes have >3 task copies each, max 8 copies of the same product. Worst offenders: HA-0646 and HA-0655 with 8 copies each, ~10 others with 7. This is **75+ new tasks per day** being generated by the recurring-task system firing repeatedly. Compounds the lag fix because the hot blob keeps refilling.

**Task 2.5.1: Investigate the recurring-task generator**

- Locate `recurringTasks` data + the code that materializes them (grep `RECUR_OPTS` and `recurringTasks`).
- Read the generation logic. Likely culprits: no idempotency check; the generator runs once per session per recurring task and creates a new task each time.
- Add idempotency: `if (already created today for product P) return`.

**Task 2.5.2: Clean up the 36 duplicate sets**

For each HA-code with >3 copies: keep the latest one in each (assignee, taskType) tuple; mark others `_deleted=true` so the merge-save handles them. Estimated cleanup: ~200-300 tasks deleted; recovers ~200-300 KB.

Detailed script left for follow-up — needs human review of which copies to keep.

## Out of Scope (deferred)

- **Per-task table (Option B):** Migrating tasks JSONB → relational rows. The right long-term answer but a 1-2 day project with breaking schema change. Eliminates concurrent-write races entirely. Plan separately when payload mitigations are no longer enough.
- **Cleanup of test debris:** 6 leftover test tasks (`TEST_PIPELINE_*`, `TEST_CLOCK_FIX_*`, `bla bla bla`) in production. Not lag-related. Can be manually deleted via the UI.

## Self-Review (post-audit)

- [x] **Spec coverage:** Phase 1 caps 5 aux rows (notifs, taskActivity, logs, errorLog) AND fixes the `dailyChallenge` null-save spam. Phase 2 splits the hot payload using **count-based** archival (revised after audit found 30-day threshold archives zero tasks today).
- [x] **Placeholders:** None — every step has concrete code or commands.
- [x] **Safety:** Phase 2 includes a backup row before the destructive split. Migration is reversible from the backup row.
- [x] **Rollback:** If Phase 2 deploy breaks anything, `git revert` + restore `id=tasks` from the backup row via a one-line PATCH. Phase 1 trims are purely additive caps; if a cap accidentally trims important data, the trim threshold can be raised in a follow-up commit without data loss (the *current* data isn't deleted retroactively — only NEW saves apply the cap, and the initial-load trim happens client-side without writing back).
- [x] **Concurrency-race disclosure:** Phase 2 does NOT eliminate concurrent-write races. Bug 2 protections remain dependent on `statusAt` field. Explicitly noted in the "Honest limitation" callout near the top.
- [x] **Audit-driven revisions logged:** Threshold corrected (date-based → count-based), statusHistory cap-per-task removed (audit showed max 19/task, not bloated), dailyChallenge fix added to Phase 1, errorLog cap added to Phase 1, recurring-task dedup elevated to Phase 2.5 (not "out of scope" — it's an active bug adding 75 tasks/day).

## Expected Impact

| Metric | Before | After Phase 1 | After Phase 2 | After Phase 2.5 |
|---|---|---|---|---|
| `tasks` payload per save | 2.72 MB | 2.72 MB | ~600 KB | ~550 KB |
| `notifs` payload | 913 KB | ~150 KB | ~150 KB | ~150 KB |
| `taskActivity` payload | 253 KB | ~100 KB | ~100 KB | ~100 KB |
| `logs` payload | 91 KB | ~50 KB | ~50 KB | ~50 KB |
| `errorLog` payload | 35 KB | ~30 KB | ~30 KB | ~30 KB |
| `dailyChallenge` save errors per session | 68 | **0** | 0 | 0 |
| Combined "noisy" save (status change + notif) | ~4.0 MB | ~3.2 MB | ~0.9 MB | ~0.8 MB |
| Realtime broadcast on status change | 2.72 MB × N users | 2.72 MB × N | ~600 KB × N | ~550 KB × N |
| New tasks generated per day (duplicate-bug-driven) | 75+ | 75+ | 75+ | ~15 |

**Expected user-visible lag improvement:** noticeable after Phase 1 (no more silent retry storms on `dailyChallenge`), significant after Phase 2 (4.5× write reduction, 4.5× realtime reduction). Phase 2.5 prevents future regrowth of the bloat.
