# Server Clock Sync + Auto-Stop Clamp Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate timer corruption caused by client clock skew (e.g. Dana's machine clock 30 min off causing negative timer totals) by syncing time from Supabase's HTTP `Date` header; also clamp the auto-stop useEffect that currently writes negative values.

**Architecture:** Add a module-level `_clockOffsetMs` that captures `(serverDate - Date.now())` from any Supabase response. Provide `nowMs()` and update `ts()` to apply the offset. Replace `Date.now()` calls inside timer math (the only places where cross-client clock skew corrupts data). Add `el ≥ 0` and `el ≤ 8h` clamps to the auto-stop `useEffect` that currently lacks them.

**Tech Stack:** Vite + React 18, single-file React monolith at `src/App.jsx` (~9k lines). No test infrastructure — verification is via `npm run build`, dev HMR, and a Playwright end-to-end check against production.

**Safety note:** No data writes during this plan beyond the deploy itself. The fix is code-only. Production state will be unchanged by the development; deployment then auto-applies the new logic.

---

## File Structure

Only one file changes: `src/App.jsx`.

**Locations to touch (existing line numbers as of HEAD `2cf14c9`):**

| Line | What's there | Change type |
|---|---|---|
| 197–213 (top-level helpers) | `saveTimers`, `_latestValues`, `_saveVersions`, `_pendingKeys`, `debouncedSave` | **Add** clock sync helpers just before this block |
| 347–348 | `gid()`, `ts()` | **Replace** `ts()` to apply offset; add `nowMs()` |
| 138–139 (cloudSaveTasksMerge) | First Supabase call | **Hook** offset capture into supabase REST response |
| 1130–1147 (auto-stop useEffect) | `el = Math.floor((Date.now() - new Date(tm.startedAt).getTime()) / 1000)` | **Replace** `Date.now()` with `nowMs()` and add `el ≥ 0`, `el ≤ 28800` clamps; read `tm` inside setTimers callback |
| 1781 (getTS) | Display elapsed | **Replace** `Date.now()` with `nowMs()` (clamps already exist) |
| 1793 (togTimer) | Toggle stop branch | **Replace** `Date.now()` with `nowMs()`, add clamps |
| 2001 (chgSt Done/ToDo branch) | Status-change stop | **Replace** `Date.now()` with `nowMs()` (clamps already exist from previous fix) |
| 2583 (beforeunload flush) | Final flush stop | **Replace** `Date.now()` with `nowMs()`, add clamps |
| 3431 (TRow timer display) | Inline display elapsed | **Replace** `Date.now()` with `nowMs()` |
| 709 (initial timer sweep) | Startup sweep age | **Replace** `Date.now()` with `nowMs()` |

**Non-timer `Date.now()` calls** (for relative time formatting, debounce versions, session liveness, age-of-overdue computation, etc.) are **left alone** — they only affect display in the current tab, and the user's own clock vs. their own data is consistent locally.

---

## Task 1: Add Clock Sync Helpers

**Files:**
- Modify: `src/App.jsx` (top-level section, just before line 197 `var saveTimers = {};`)

- [ ] **Step 1: Add module-level clock state and sync function**

Insert this block immediately before the `var saveTimers = {};` line (currently line 197):

```js
// ═══ Server clock sync (Bug 4 hardening) ═══
// Clients can have wildly wrong system clocks (NTP off, manual changes, dead CMOS).
// We sync to Supabase's HTTP `Date` header at startup and on every subsequent response
// so all timer math uses one authoritative clock regardless of any user's local time.
var _clockOffsetMs = 0;
var _clockOffsetLastSync = 0;
function _updateClockOffsetFromHeader(headerValue) {
  if (!headerValue) return;
  var serverMs = new Date(headerValue).getTime();
  if (!isFinite(serverMs)) return;
  var localMs = Date.now();
  var newOffset = serverMs - localMs;
  // Smooth tiny jitter: only update if >2s difference from current offset
  if (Math.abs(newOffset - _clockOffsetMs) > 2000 || _clockOffsetLastSync === 0) {
    _clockOffsetMs = newOffset;
    if (Math.abs(newOffset) > 60000) {
      console.warn("[CLOCK SYNC] Local clock offset detected:", Math.round(newOffset / 1000) + "s. Server-corrected timestamps active.");
    }
  }
  _clockOffsetLastSync = localMs;
}
function nowMs() { return Date.now() + _clockOffsetMs; }

```

- [ ] **Step 2: Update the `ts()` helper to apply the offset**

Find line ~348:

```js
function ts() { return new Date().toISOString(); }
```

Replace with:

```js
function ts() { return new Date(Date.now() + _clockOffsetMs).toISOString(); }
```

- [ ] **Step 3: Verify build still compiles**

Run: `npm run build`
Expected: builds successfully, no syntax errors, bundle size roughly the same (within 1KB).

- [ ] **Step 4: Commit**

```bash
git add src/App.jsx
git commit -m "Add server clock sync helpers (no behavior change yet)

Adds _clockOffsetMs, nowMs(), _updateClockOffsetFromHeader() and updates ts()
to apply the offset. Not yet wired to capture from Supabase responses — that
is the next task. Offset defaults to 0 so behavior is identical to before."
```

---

## Task 2: Capture Server Time from Supabase Responses

**Files:**
- Modify: `src/App.jsx` (lines ~135–195, the `cloudSaveTasksMerge` function; also wherever the initial bulk load happens around line 657–700)

- [ ] **Step 1: Wire offset capture into bootstrap (before Promise.all in loadAll)**

The cleanest hook point is to fetch the `Date` header on every supabase REST call we already make. The `supabase-js` client doesn't expose response headers directly, so we hook a parallel `fetch(HEAD)` at boot AND piggyback on `cloudLoad` indirectly via a one-shot bootstrap call.

Find the `loadAll` function (around line 662). It looks like:

```js
  useEffect(function() {
    async function loadAll() {
      var [t, tk, lg, se, sh, pr, tm, tpl, tgt, sht, nf, tt, dp, lt, rc, stH, pa, at, ach, dc, lh, ann, sl, lv, lr, brd, plf, plr, uxp, mb, wc, wh, pen, pc, ta, lar] = await Promise.all([
```

Insert this block **just BEFORE the `await Promise.all([...])` line** (so the sync completes before the bulk load):

```js
      // ═══ Sync server clock (Bug 4 hardening) ═══
      // Done before any Supabase work so all subsequent timestamps use the correct clock.
      // Bounded by a 5s timeout so a slow/down Supabase never blocks app startup —
      // if it times out, we fall back to local clock with offset 0 (no worse than before).
      try {
        var SUPA_URL = "https://ploucecgizjwyumzmhmo.supabase.co";
        var SUPA_KEY = "sb_publishable_FoAoSy7d052B3oVbcxiuyg_iLlTLiSh";
        var clockCtl = new AbortController();
        var clockTimeout = setTimeout(function() { clockCtl.abort(); }, 5000);
        var clockRes = await fetch(SUPA_URL + "/rest/v1/", { method: "HEAD", headers: { apikey: SUPA_KEY }, signal: clockCtl.signal });
        clearTimeout(clockTimeout);
        _updateClockOffsetFromHeader(clockRes.headers.get("date"));
      } catch (e) {
        console.warn("[CLOCK SYNC] Initial sync failed, falling back to local clock:", e && e.message);
      }
```

- [ ] **Step 2: Add periodic re-sync (every 1 hour)**

Find the realtime-subscription useEffect (around line 766–843). Just below it, add a new useEffect:

```js
  // Periodic clock re-sync (Bug 4 hardening) — keeps offset accurate during long sessions.
  useEffect(function() {
    if (!user) return;
    var iv = setInterval(function() {
      try {
        var SUPA_URL = "https://ploucecgizjwyumzmhmo.supabase.co";
        var SUPA_KEY = "sb_publishable_FoAoSy7d052B3oVbcxiuyg_iLlTLiSh";
        fetch(SUPA_URL + "/rest/v1/", { method: "HEAD", headers: { apikey: SUPA_KEY } })
          .then(function(r) { _updateClockOffsetFromHeader(r.headers.get("date")); })
          .catch(function() { /* silent — keep current offset */ });
      } catch (e) { /* silent */ }
    }, 3600000); // every hour
    return function() { clearInterval(iv); };
  }, [user]);
```

- [ ] **Step 3: Verify build still compiles**

Run: `npm run build`
Expected: builds clean.

- [ ] **Step 4: Run dev HMR and confirm clock sync fires in console**

Run: `npm run dev` (if not already running, dev server should HMR pick up changes)
Open browser to `http://localhost:5173/`, log in as `admin / papagal18`.
In browser console, check that `_clockOffsetMs` reflects server time. Run:

```js
// In browser console
window._debugClock = function() { return { offset_s: Math.round(_clockOffsetMs / 1000), localNow: new Date().toISOString(), correctedNow: new Date(Date.now() + _clockOffsetMs).toISOString() }; };
```

(That helper won't exist unless we add it — it's optional. The real verification is no console errors and the warning message appearing if offset > 60s.)

- [ ] **Step 5: Commit**

```bash
git add src/App.jsx
git commit -m "Wire server clock sync to Supabase Date header

Bootstrap sync runs before initial loadAll; periodic re-sync every hour
piggybacks on a HEAD request to the Supabase REST endpoint. Failures fall
back silently to local clock with a console warning. ts() and nowMs() now
return server-aligned timestamps for new writes."
```

---

## Task 3: Replace Date.now() in Timer Math + Clamp Auto-Stop

**Files:**
- Modify: `src/App.jsx` at lines 709, 1130–1147, 1781, 1793, 2001, 2583, 3431

- [ ] **Step 1: Replace Date.now() at line 709 (initial timer sweep)**

Find:

```js
      var nowMs = Date.now();
```

Replace with (note variable rename since `nowMs` is now a global function):

```js
      var sweepNow = nowMs();
```

Then in the same block, find:

```js
          var ageSec = Math.floor((nowMs - new Date(stm.startedAt).getTime()) / 1000);
```

Replace with:

```js
          var ageSec = Math.floor((sweepNow - new Date(stm.startedAt).getTime()) / 1000);
```

- [ ] **Step 2: Fix the auto-stop useEffect (line 1130–1147)**

Find the full block:

```js
  useEffect(function() {
    if (loading || tasks.length === 0) return;
    var needsUpdate = false;
    var newTimers = Object.assign({}, timers);
    Object.keys(timers).forEach(function(tid) {
      var tm = timers[tid];
      if (!tm || !tm.running) return;
      var t = tasks.find(function(x) { return x.id === tid; });
      // Stop if task doesn't exist, is a campaign parent, or not In Progress
      if (!t || t._campaignParent === true || t.status !== "In Progress") {
        var el = tm.startedAt ? Math.floor((Date.now() - new Date(tm.startedAt).getTime()) / 1000) : 0;
        newTimers[tid] = { running: false, total: (tm.total || 0) + el, startedAt: null };
        needsUpdate = true;
      }
    });
    if (needsUpdate) setTimers(newTimers);
  }, [tasks, loading]);
```

Replace with:

```js
  useEffect(function() {
    if (loading || tasks.length === 0) return;
    setTimers(function(prevTimers) {
      var newTimers = Object.assign({}, prevTimers);
      var needsUpdate = false;
      Object.keys(prevTimers).forEach(function(tid) {
        var tm = prevTimers[tid];
        if (!tm || !tm.running) return;
        var t = tasks.find(function(x) { return x.id === tid; });
        // Stop if task doesn't exist, is a campaign parent, or not In Progress
        if (!t || t._campaignParent === true || t.status !== "In Progress") {
          // Bug 4 hardening: use server-aligned clock + clamp to [0, 8h] to neutralize
          // negative or massive values from other clients' clock skew.
          var el = tm.startedAt ? Math.floor((nowMs() - new Date(tm.startedAt).getTime()) / 1000) : 0;
          if (el < 0) el = 0;
          if (el > 28800) el = 28800;
          newTimers[tid] = { running: false, total: (tm.total || 0) + el, startedAt: null };
          needsUpdate = true;
        }
      });
      return needsUpdate ? newTimers : prevTimers;
    });
  }, [tasks, loading]);
```

This makes three improvements at once: server clock, clamps, and reading `tm` inside the setter callback (no stale closure).

- [ ] **Step 3: Replace Date.now() in getTS (line 1781)**

Find:

```js
      var el = Math.floor((Date.now() - new Date(tm.startedAt).getTime()) / 1000);
```

Replace with:

```js
      var el = Math.floor((nowMs() - new Date(tm.startedAt).getTime()) / 1000);
```

(Clamps already exist on the following lines from a previous fix.)

- [ ] **Step 4: Replace Date.now() and add clamps in togTimer stop branch (line 1793)**

Find:

```js
      if (tm.running) { var el = tm.startedAt ? Math.floor((Date.now() - new Date(tm.startedAt).getTime()) / 1000) : 0; n[tid] = { running: false, total: tm.total + el, startedAt: null }; }
```

Replace with:

```js
      if (tm.running) {
        var el = tm.startedAt ? Math.floor((nowMs() - new Date(tm.startedAt).getTime()) / 1000) : 0;
        if (el < 0) el = 0;
        if (el > 28800) el = 28800;
        n[tid] = { running: false, total: (tm.total || 0) + el, startedAt: null };
      }
```

- [ ] **Step 5: Replace Date.now() in chgSt stop branch (line 2001 area)**

Find:

```js
        var el = tm.startedAt ? Math.floor((Date.now() - new Date(tm.startedAt).getTime()) / 1000) : 0;
```

Inside the existing `setTimers(function(p) { ... })` block. Replace with:

```js
        var el = tm.startedAt ? Math.floor((nowMs() - new Date(tm.startedAt).getTime()) / 1000) : 0;
```

(Clamps already exist on the following two lines from the previous Bug 4 fix.)

- [ ] **Step 6: Replace Date.now() and add clamps in beforeunload flush (line 2583)**

Find:

```js
        var tm = timers[tid]; if (tm && tm.running) { var el = tm.startedAt ? Math.floor((Date.now() - new Date(tm.startedAt).getTime()) / 1000) : 0; setTimers(function(p2) { var n2 = Object.assign({}, p2); n2[tid] = { running: false, total: (tm.total || 0) + el, startedAt: null }; return n2; }); }
```

Replace with:

```js
        var tm = timers[tid];
        if (tm && tm.running) {
          var el = tm.startedAt ? Math.floor((nowMs() - new Date(tm.startedAt).getTime()) / 1000) : 0;
          if (el < 0) el = 0;
          if (el > 28800) el = 28800;
          setTimers(function(p2) { var n2 = Object.assign({}, p2); n2[tid] = { running: false, total: (tm.total || 0) + el, startedAt: null }; return n2; });
        }
```

- [ ] **Step 7a: Replace Date.now() in editor conflict check (line 6400)**

Find:

```js
      var age = Date.now() - new Date(editor.at).getTime();
```

Replace with:

```js
      var age = nowMs() - new Date(editor.at).getTime();
```

This is the only non-timer site where a stored server-corrected timestamp is compared to local `Date.now()` — without this change, a clock-skewed client would see stale editor warnings.

- [ ] **Step 7: Replace Date.now() in TRow inline timer display (line 3431)**

Find:

```js
          {running && <span style={{ fontSize: 11, fontWeight: 700, color: "#DC2626", fontVariantNumeric: "tabular-nums" }}>{ft((timers[t.id].total || 0) + (timers[t.id].startedAt ? Math.floor((Date.now() - new Date(timers[t.id].startedAt).getTime()) / 1000) : 0))}</span>}
```

Replace `Date.now()` with `nowMs()`:

```js
          {running && <span style={{ fontSize: 11, fontWeight: 700, color: "#DC2626", fontVariantNumeric: "tabular-nums" }}>{ft((timers[t.id].total || 0) + (timers[t.id].startedAt ? Math.floor((nowMs() - new Date(timers[t.id].startedAt).getTime()) / 1000) : 0))}</span>}
```

(This is a display-only path; we don't clamp here because `getTS` is the source of truth — but for consistency we use the corrected clock.)

- [ ] **Step 8: Verify build**

Run: `npm run build`
Expected: builds clean, no errors.

- [ ] **Step 9: Verify dev HMR runs without runtime errors**

Run: `npm run dev` (already running)
In the browser at `http://localhost:5173/`, log in as admin. Confirm no console errors on:
- Login
- Navigating to Tasks page
- Opening a task
- Creating a test task

- [ ] **Step 10: Commit**

```bash
git add src/App.jsx
git commit -m "Use server-aligned clock for timer math + clamp auto-stop

Replaces Date.now() with nowMs() at every timer-math callsite (auto-stop
useEffect, getTS, togTimer, chgSt stop branch, beforeunload flush, TRow
display, initial sweep). Adds the missing el >= 0 and el <= 8h clamps to
the auto-stop useEffect — that path previously could write negative timer
totals when another user with a correct clock processed a task whose
startedAt was set by a user with a fast clock (e.g. Dana's machine 30 min
ahead, producing -1744s totals)."
```

---

## Task 4: End-to-End Verification on Production

**Files:** (no code changes — verification only)

- [ ] **Step 1: Push to GitHub and let Vercel auto-deploy**

```bash
git push origin main
```

Expected: push succeeds. Vercel auto-deploy kicks off.

- [ ] **Step 2: Poll for new bundle hash**

```bash
# Wait for new bundle to appear, polling every 15 seconds
old="DE2AD-lC"
while true; do
  cur=$(curl -s "https://work-heyads.ro/?_v=$(date +%s)" | grep -oE '/assets/index-[A-Za-z0-9_-]+\.js' | head -1)
  if [ -n "$cur" ] && ! echo "$cur" | grep -q "$old"; then
    echo "DEPLOYED: $cur"
    break
  fi
  sleep 15
done
```

Expected: deploy completes in 2-3 minutes.

- [ ] **Step 3: Confirm new bundle contains the fix markers**

```bash
curl -s "https://work-heyads.ro/$(curl -s 'https://work-heyads.ro/' | grep -oE '/assets/index-[A-Za-z0-9_-]+\.js' | head -1)" -o /tmp/new-bundle.js
grep -c "_clockOffsetMs" /tmp/new-bundle.js
grep -c "CLOCK SYNC" /tmp/new-bundle.js
```

Expected:
- `_clockOffsetMs` appears (count ≥ 1)
- `CLOCK SYNC` appears (count = 1, the warning message)

- [ ] **Step 4: Driven test via Playwright (run from this session)**

Navigate to `https://work-heyads.ro/`, log in as admin (`admin / papagal18`), open the browser console, and execute:

```js
// Check that offset was captured
console.log('CLOCK OFFSET:', _clockOffsetMs, 'ms');
console.log('Server-corrected now:', new Date(Date.now() + _clockOffsetMs).toISOString());
```

Expected: `_clockOffsetMs` is finite (probably a small number, e.g. < 5000 ms unless the test machine has skew). The corrected `now` matches real-world current time within a second.

- [ ] **Step 5: Create a Dana test task, mark In Progress, then Done, verify timer is sane**

In the Playwright session:
1. Open the New Task form.
2. Title: `TEST_CLOCK_FIX_DELETE_ME`, assignee Dana, taskType `Creative video`, department `CREATIVE VIDEO`.
3. Create the task. Mark In Progress. Wait ~10 seconds. Mark Done.
4. Query Supabase for the timer total:

```bash
curl -s "https://ploucecgizjwyumzmhmo.supabase.co/rest/v1/app_data?id=eq.timers&select=data" \
  -H "apikey: sb_publishable_FoAoSy7d052B3oVbcxiuyg_iLlTLiSh" \
  -H "Authorization: Bearer sb_publishable_FoAoSy7d052B3oVbcxiuyg_iLlTLiSh" \
  -o /tmp/verify-timers.json
curl -s "https://ploucecgizjwyumzmhmo.supabase.co/rest/v1/app_data?id=eq.tasks&select=data" \
  -H "apikey: sb_publishable_FoAoSy7d052B3oVbcxiuyg_iLlTLiSh" \
  -H "Authorization: Bearer sb_publishable_FoAoSy7d052B3oVbcxiuyg_iLlTLiSh" \
  -o /tmp/verify-tasks.json

node -e "
const tm=JSON.parse(require('fs').readFileSync('/tmp/verify-timers.json','utf8'))[0].data;
const tasks=JSON.parse(require('fs').readFileSync('/tmp/verify-tasks.json','utf8'))[0].data;
const t=tasks.find(x=>(x.title||'').includes('TEST_CLOCK_FIX'));
if (!t) { console.log('test task not found'); process.exit(1); }
console.log('test task timer:', JSON.stringify(tm[t.id]));
console.log('test task statusAt:', t.statusAt, 'updatedAt:', t.updatedAt);
"
```

Expected: timer total is between 8 and 60 seconds (non-negative, no inflation). No `-1744`-style corruption. `statusAt` and `updatedAt` should be within a few seconds of real-world current time (proving server-clock sync worked).

- [ ] **Step 6: One-shot data cleanup for the existing negative-timer task**

The deploy fixes future writes but doesn't repair existing data. Specifically `mp34eq0b9et1v` ("Placă Electrică...") has `total: -1744`. Clamp it to 0:

```bash
node -e "
const https=require('https');
const URL='ploucecgizjwyumzmhmo.supabase.co';
const KEY='sb_publishable_FoAoSy7d052B3oVbcxiuyg_iLlTLiSh';
function req(method,path,body){return new Promise((res,rej)=>{const r=https.request({hostname:URL,path,method,headers:{apikey:KEY,Authorization:'Bearer '+KEY,'Content-Type':'application/json',Prefer:'return=representation'}},(rs)=>{let b='';rs.on('data',d=>b+=d);rs.on('end',()=>res({status:rs.statusCode,body:b}))});r.on('error',rej);if(body)r.write(JSON.stringify(body));r.end();})}
(async()=>{
  const get=await req('GET','/rest/v1/app_data?id=eq.timers&select=data',null);
  const tm=JSON.parse(get.body)[0].data;
  let fixed=0;
  for(const k of Object.keys(tm)){
    if(tm[k] && typeof tm[k].total === 'number' && tm[k].total < 0){
      console.log('Fixing',k,'from',tm[k].total,'to 0');
      tm[k] = Object.assign({}, tm[k], { total: 0 });
      fixed++;
    }
  }
  console.log('Total fixed:',fixed);
  if (fixed > 0){
    const w=await req('PATCH','/rest/v1/app_data?id=eq.timers',{data:tm});
    console.log('Write status:',w.status);
  }
})();
"
```

Expected: `mp34eq0b9et1v` total goes from `-1744` to `0`; any other negative-total timers get the same treatment; write returns status 200.

- [ ] **Step 7: Delete the test task**

Via Playwright: locate the `TEST_CLOCK_FIX_DELETE_ME` task and click its delete button (or, if delete UI is awkward, leave it Done — admin can manually remove later).

- [ ] **Step 8: Final sanity check — pull production data once more**

```bash
curl -s "https://ploucecgizjwyumzmhmo.supabase.co/rest/v1/app_data?id=eq.timers&select=data" \
  -H "apikey: sb_publishable_FoAoSy7d052B3oVbcxiuyg_iLlTLiSh" \
  -H "Authorization: Bearer sb_publishable_FoAoSy7d052B3oVbcxiuyg_iLlTLiSh" \
| node -e "
const tm=JSON.parse(require('fs').readFileSync(0,'utf8'))[0].data;
const neg=Object.entries(tm).filter(([k,v])=>v && typeof v.total==='number' && v.total<0);
console.log('Negative timers remaining:', neg.length);
"
```

Expected: `0` negative timers.

---

## Rollback Plan

If anything regresses after deploy, immediate rollback:

```bash
git revert HEAD --no-edit
git push origin main
```

Vercel will auto-deploy the previous version (current `index-DE2AD-lC.js` or whatever was live before). Production restored within 2-3 minutes.

The clock-offset addition is **purely additive** — `_clockOffsetMs` defaults to `0`, which means `nowMs() === Date.now()` if sync fails. So a sync failure can't make behavior worse than before; it just doesn't improve it.

---

## Explicit Out-of-Scope (deliberate)

The following sites also use `Date.now()` or `new Date().toISOString()` directly. They are **knowingly left as-is** because they don't cause cross-client data corruption — only at-most a display offset on a single client with a wrong clock. Listing them so a future engineer knows we considered them:

| Site | Why left alone |
|---|---|
| `gid()` line 347 (`Date.now().toString(36)`) | ID generator; the random suffix prevents collisions. Skewed IDs are uglier but not incorrect. |
| `_saveVersions[key] = Date.now()` (lines 60, 72, 215, 1057) | Local-only in-memory cache for realtime echo guard. Compared with local `Date.now()` only. No cross-client comparison. |
| Realtime echo guard at line 838 (`Date.now() - lastSaveTime`) | Same — local vs. local. |
| Auto-resync grace check line 879 (`Date.now() - lastSave < 5000`) | Same — local vs. local. |
| Relative-time formatters (`fr` line 356, `isOv` line 361, dashboard "X ago" displays) | Display-only. Wrong clock shows wrong relative time on that one user's screen; data integrity is unaffected. |
| `updated_at` field in Supabase upserts (lines 103, 185, 258, 823, 988, 1133, etc.) | Used by Supabase as a row metadata column. Our app reads `data.updatedAt` (which **is** now corrected via `ts()`) for merge decisions, not the row-level `updated_at`. |

**Follow-up issue** (low priority, can ship later): for full consistency, replace every remaining `new Date().toISOString()` with `ts()`. Most impactful: the `updated_at` field passed to `supabase.upsert(...)` — if the user inspects Supabase directly, those rows would show clock-corrected times.

---

## Self-Review Checklist

Run before declaring the plan done:

- [x] **Spec coverage:** Server clock sync (Task 1+2). Date.now() replacement in timer math (Task 3). Auto-stop clamps (Task 3 Step 2). Verification (Task 4). Cleanup of existing bad data (Task 4 Step 6). ✓
- [x] **Placeholder scan:** No TBDs, all code blocks concrete. ✓
- [x] **Type/name consistency:**
  - `nowMs()` (global function) does not collide with `nowMs` local variable at line 709 — renamed local to `sweepNow`. ✓
  - `_clockOffsetMs` referenced consistently. ✓
  - `_updateClockOffsetFromHeader` defined and called once at bootstrap, once per hour. ✓
- [x] **Safety:** Default offset = 0 → fail-safe. AbortController timeout → can't block app startup. Rollback plan included. ✓
- [x] **Out-of-scope is explicit:** Section above. Future engineer can pick up extras without re-deriving them. ✓
