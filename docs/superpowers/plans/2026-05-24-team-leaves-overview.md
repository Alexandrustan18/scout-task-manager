# Team Leaves Overview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a team-wide "Calendar echipa" card to the Concedii page so every team member (admin, PM, member) can see who is on leave each day at a glance.

**Architecture:** One-file change inside the monolithic `src/App.jsx`. Add `"leaves"` to the member nav allow-list, introduce a `viewableUsers` constant inside `LeavesPage` (replacing `editableUsers` for read-only listings), and insert a new card with a month-grid (rows = team members, columns = days) above the existing per-user calendar. Read-only — no DB changes, no new props.

**Tech Stack:** React 18 + Vite. JSX. No TypeScript. CSS-in-JS via inline style objects. No test framework (existing pattern: build + Playwright smoke test in browser).

**Reference docs:**
- Spec: `docs/superpowers/specs/2026-05-24-team-leaves-overview-design.md`
- Existing `LeavesPage` source: `src/App.jsx:6170-6363`
- Nav access logic: `src/App.jsx:2687-2693`
- Existing per-user calendar (for color/style reference): `src/App.jsx:6334-6360`

**Pre-flight context (don't skip):**
- The codebase is a single 9k-line `src/App.jsx`. No tests. Verification is `npx vite build` (must succeed) + manual smoke test in browser.
- All styling is inline object syntax. Existing constants: `S` (style object), `GR` (green accent `#10B981`-ish), `MN` (Romanian months array), `TD` (today as YYYY-MM-DD), `ds(date)` (Date → YYYY-MM-DD), `isOnLeave(leaves, uid, dateStr)` (membership check).
- Member colors live in `team[uid].color` (e.g., Mara `#2563EB`, Carla `#DB2777`). Fallback `#94A3B8`.
- The shared month state is `calMonth` (already `useState(new Date())` on line 6173 — DO NOT introduce a second one).
- `leaves` is `{userId: ["YYYY-MM-DD", ...]}`. Reads are O(n) — fine for 10 users × 31 days.

**Deploy pattern:** Push to `main`. Vercel auto-deploys from `github.com/Alexandrustan18/scout-task-manager`. Live URL: `https://work-heyads.ro`.

---

## File Structure

| File | What changes |
|---|---|
| `src/App.jsx` | Modify only — 3 spots inside `LeavesPage` + 1 spot in `accessibleNav`. |

No new files. No new components extracted (the feature is small enough to inline in `LeavesPage`).

---

## Task 1: Expose Concedii to members

**Files:**
- Modify: `src/App.jsx:2691`

- [ ] **Step 1: Locate the current member nav allow-list**

Run:
```bash
grep -n 'me.role === "member"' /Users/bogdanpeltea/Desktop/scout-task-manager/src/App.jsx | head -3
```

Expected: line 2691 prints
```
2691:    if (me.role === "member") return ["tasks", "kanban", "achievements", "announce"].includes(n.id);
```

- [ ] **Step 2: Add `"leaves"` to the member allow-list**

Use the Edit tool on `src/App.jsx`:

Old:
```js
    if (me.role === "member") return ["tasks", "kanban", "achievements", "announce"].includes(n.id);
```

New:
```js
    if (me.role === "member") return ["tasks", "kanban", "achievements", "announce", "leaves"].includes(n.id);
```

- [ ] **Step 3: Verify build**

Run:
```bash
cd /Users/bogdanpeltea/Desktop/scout-task-manager && npx vite build 2>&1 | tail -5
```

Expected: `✓ built in ...` with no syntax errors.

- [ ] **Step 4: Do NOT commit yet**

Wait until Task 4 completes — we ship the whole feature in one commit so the page isn't half-broken between deploys.

---

## Task 2: Replace `editableUsers` with `viewableUsers` for read-only lists

**Files:**
- Modify: `src/App.jsx:6172` (default `selectedUser`)
- Modify: `src/App.jsx:6186` (introduce `viewableUsers`, keep `editableUsers` only if still used)
- Modify: `src/App.jsx:6255` (`todayOnLeave` source)
- Modify: `src/App.jsx:6320` (user picker rendering)

Why: members currently can only see themselves in the picker (because `editableUsers` is filtered by `canEditUser`). The new behavior: everyone sees a read-only list of all non-admin members. Permission gating already lives inside `toggleDate` (line 6191-6203) so opening a non-editable user's calendar is safe — clicks just do nothing.

- [ ] **Step 1: Introduce `viewableUsers` constant**

Use the Edit tool on `src/App.jsx`:

Old:
```js
  var editableUsers = visUsers.filter(function(u) { return team[u] && team[u].role !== "admin" && canEditUser(u); });

  // Members can only request, not directly add
  var canDirectEdit = me.role === "admin" || me.role === "pm";
```

New:
```js
  var editableUsers = visUsers.filter(function(u) { return team[u] && team[u].role !== "admin" && canEditUser(u); });

  // All non-admin team members, used for read-only listings (team grid, picker, today-on-leave)
  var viewableUsers = Object.keys(team).filter(function(u) {
    return team[u] && team[u].role !== "admin";
  }).sort(function(a, b) {
    return ((team[a] || {}).name || "").localeCompare((team[b] || {}).name || "");
  });

  // Members can only request, not directly add
  var canDirectEdit = me.role === "admin" || me.role === "pm";
```

- [ ] **Step 2: Fix the `selectedUser` initial value so members land on themselves**

Use the Edit tool on `src/App.jsx`:

Old:
```js
  var [selectedUser, setSelectedUser] = useState(visUsers.filter(function(u) { return u !== "admin" && team[u] && team[u].role !== "admin"; })[0] || "");
```

New:
```js
  var [selectedUser, setSelectedUser] = useState(function() {
    // Use `team` directly (visUsers not in scope yet for non-admin role)
    var nonAdmin = Object.keys(team).filter(function(u) { return team[u] && team[u].role !== "admin"; });
    if (nonAdmin.indexOf(user) >= 0) return user;
    return nonAdmin[0] || "";
  });
```

- [ ] **Step 3: Switch `todayOnLeave` to use `viewableUsers`**

Use the Edit tool on `src/App.jsx`:

Old:
```js
  var todayOnLeave = editableUsers.filter(function(u2) { return isOnLeave(leaves, u2, TD); });
```

New:
```js
  var todayOnLeave = viewableUsers.filter(function(u2) { return isOnLeave(leaves, u2, TD); });
```

- [ ] **Step 4: Switch the user picker to render `viewableUsers`**

Use the Edit tool on `src/App.jsx`:

Old:
```js
        {editableUsers.map(function(u2) {
          var t2 = team[u2] || {};
          var count = (leaves[u2] || []).length;
          var isSel = selectedUser === u2;
          return <div key={u2} onClick={function() { setSelectedUser(u2); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 6, cursor: "pointer", background: isSel ? GR + "15" : "transparent", marginBottom: 3, border: "1px solid " + (isSel ? GR + "30" : "transparent") }}>
            <Av color={t2.color} size={26} fs={11} userId={u2}>{(t2.name || "?")[0]}</Av>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: isSel ? 700 : 500, color: isSel ? GR : "#1E293B" }}>{t2.name}</div>
              <div style={{ fontSize: 10, color: "#94A3B8" }}>{count} zile concediu</div>
            </div>
          </div>;
        })}
```

New:
```js
        {viewableUsers.map(function(u2) {
          var t2 = team[u2] || {};
          var count = (leaves[u2] || []).length;
          var isSel = selectedUser === u2;
          var ownerEditable = canEditUser(u2);
          return <div key={u2} onClick={function() { setSelectedUser(u2); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 6, cursor: "pointer", background: isSel ? GR + "15" : "transparent", marginBottom: 3, border: "1px solid " + (isSel ? GR + "30" : "transparent") }}>
            <Av color={t2.color} size={26} fs={11} userId={u2}>{(t2.name || "?")[0]}</Av>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: isSel ? 700 : 500, color: isSel ? GR : "#1E293B" }}>{t2.name}{!ownerEditable && <span style={{ fontSize: 9, color: "#94A3B8", marginLeft: 6, fontWeight: 500 }}>(read-only)</span>}</div>
              <div style={{ fontSize: 10, color: "#94A3B8" }}>{count} zile concediu</div>
            </div>
          </div>;
        })}
```

- [ ] **Step 5: Verify build**

Run:
```bash
cd /Users/bogdanpeltea/Desktop/scout-task-manager && npx vite build 2>&1 | tail -5
```

Expected: `✓ built in ...`. If it fails on a missing reference, the most likely cause is `editableUsers` still referenced somewhere — grep with:
```bash
grep -n "editableUsers" /Users/bogdanpeltea/Desktop/scout-task-manager/src/App.jsx
```
The only remaining reference should be the declaration on line 6186 (we kept it because `canDirectEdit` does NOT depend on it, but if no consumer remains, remove it too in this step).

- [ ] **Step 6: If `editableUsers` is unused, remove it**

If the grep above returns only the declaration line, use the Edit tool:

Old:
```js
  var editableUsers = visUsers.filter(function(u) { return team[u] && team[u].role !== "admin" && canEditUser(u); });

  // All non-admin team members, used for read-only listings (team grid, picker, today-on-leave)
```

New:
```js
  // All non-admin team members, used for read-only listings (team grid, picker, today-on-leave)
```

Then re-run the build:
```bash
cd /Users/bogdanpeltea/Desktop/scout-task-manager && npx vite build 2>&1 | tail -5
```

---

## Task 3: Build the "Calendar echipa" team-timeline card

**Files:**
- Modify: `src/App.jsx` — insert new card immediately before the existing 2-column grid at line ~6317.

The card is inserted between the member request-history block (ends ~line 6315) and the 2-column grid that contains the picker + per-user calendar (starts ~line 6317).

- [ ] **Step 1: Identify the insertion point**

Run:
```bash
grep -n 'gridTemplateColumns: "250px 1fr"' /Users/bogdanpeltea/Desktop/scout-task-manager/src/App.jsx | head -3
```

Expected output includes line 6317:
```
6317:    <div style={{ display: "grid", gridTemplateColumns: "250px 1fr", gap: 16 }}>
```

This is the line we insert BEFORE. The `<div>` immediately above this — the one closing the "Cererile mele" Card — is the closing `</Card>}` on ~line 6315. We add our new `<Card>` between those.

- [ ] **Step 2: Insert the new "Calendar echipa" card**

Use the Edit tool on `src/App.jsx`:

Old:
```js
        </Card>}

    <div style={{ display: "grid", gridTemplateColumns: "250px 1fr", gap: 16 }}>
```

(Note: there will be `{!canDirectEdit && ...` block ending; if the Edit tool's `old_string` isn't unique, expand to include the line just above which is `</Card>}` and the unique gridTemplateColumns line.)

New (replacing the matched region — keep the closing `</Card>}` for the request history above, insert the new card, keep the grid below):
```js
        </Card>}

    {/* Team-wide leaves grid (read-only for everyone) */}
    <Card style={{ marginBottom: 16, padding: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#1E293B" }}>Calendar echipa</div>
          <div style={{ fontSize: 11, color: "#94A3B8" }}>Cine e in concediu in {MN[m]} {y}. Click pe un membru pentru detalii.</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button style={Object.assign({}, S.cancelBtn, { padding: "4px 10px" })} onClick={function() { var n = new Date(calMonth); n.setMonth(n.getMonth() - 1); setCalMonth(n); }}>&lt;</button>
          <div style={{ fontSize: 12, fontWeight: 700, minWidth: 90, textAlign: "center" }}>{MN[m]} {y}</div>
          <button style={Object.assign({}, S.cancelBtn, { padding: "4px 10px" })} onClick={function() { var n = new Date(calMonth); n.setMonth(n.getMonth() + 1); setCalMonth(n); }}>&gt;</button>
        </div>
      </div>

      {(function() {
        // Build days-of-month array once for reuse below
        var daysArr = [];
        for (var dd = 1; dd <= dim; dd++) daysArr.push(dd);
        var hasAnyLeave = viewableUsers.some(function(u2) {
          return (leaves[u2] || []).some(function(ds2) {
            return ds2.indexOf(y + "-" + String(m + 1).padStart(2, "0")) === 0;
          });
        });
        if (!hasAnyLeave) {
          return <div style={{ padding: "20px 8px", textAlign: "center", color: "#94A3B8", fontSize: 12 }}>Niciun concediu in {MN[m]} {y}.</div>;
        }
        return <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          <div style={{ minWidth: 140 + daysArr.length * 28 }}>
            {/* Day-number header row */}
            <div style={{ display: "grid", gridTemplateColumns: "140px repeat(" + daysArr.length + ", minmax(0, 1fr))", gap: 2, marginBottom: 4 }}>
              <div /> {/* spacer above name column */}
              {daysArr.map(function(dd) {
                var dStr = y + "-" + String(m + 1).padStart(2, "0") + "-" + String(dd).padStart(2, "0");
                var dt = new Date(y, m, dd);
                var dow = dt.getDay();
                var isWk = dow === 0 || dow === 6;
                var isTd2 = dStr === TD;
                var dayLetter = ["D", "L", "Ma", "Mi", "J", "V", "S"][dow];
                return <div key={dd} style={{ textAlign: "center", fontSize: 9, color: isTd2 ? GR : isWk ? "#CBD5E1" : "#94A3B8", fontWeight: isTd2 ? 700 : 600, padding: "2px 0", borderBottom: isTd2 ? "2px solid " + GR : "1px solid transparent", lineHeight: 1.1 }}>
                  <div>{dayLetter}</div>
                  <div style={{ fontSize: 10 }}>{dd}</div>
                </div>;
              })}
            </div>

            {/* One row per team member */}
            {viewableUsers.map(function(u2) {
              var t2 = team[u2] || {};
              var color = t2.color || "#94A3B8";
              var isSel = selectedUser === u2;
              return <div key={u2} onClick={function() { setSelectedUser(u2); }} style={{ display: "grid", gridTemplateColumns: "140px repeat(" + daysArr.length + ", minmax(0, 1fr))", gap: 2, marginBottom: 3, cursor: "pointer", padding: "3px 0", borderRadius: 4, background: isSel ? GR + "08" : "transparent" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, paddingRight: 6, position: "sticky", left: 0, background: isSel ? "#F0FDF4" : "#fff", zIndex: 2 }}>
                  <Av color={color} size={22} fs={10} userId={u2}>{(t2.name || "?")[0]}</Av>
                  <div style={{ fontSize: 12, fontWeight: isSel ? 700 : 500, color: isSel ? GR : "#1E293B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t2.name}</div>
                </div>
                {daysArr.map(function(dd) {
                  var dStr = y + "-" + String(m + 1).padStart(2, "0") + "-" + String(dd).padStart(2, "0");
                  var dt = new Date(y, m, dd);
                  var dow = dt.getDay();
                  var isWk = dow === 0 || dow === 6;
                  var isTd2 = dStr === TD;
                  var isL = isOnLeave(leaves, u2, dStr);
                  return <div key={dd} title={isL ? (t2.name || u2) + " in concediu " + dStr : dStr} style={{ height: 22, borderRadius: 3, background: isL ? color : isTd2 ? GR + "20" : isWk ? "#F8FAFC" : "#fff", border: isTd2 && !isL ? "1px solid " + GR : "1px solid #F1F5F9" }} />;
                })}
              </div>;
            })}
          </div>
        </div>;
      })()}
    </Card>

    <div style={{ display: "grid", gridTemplateColumns: "250px 1fr", gap: 16 }}>
```

- [ ] **Step 3: Verify build**

Run:
```bash
cd /Users/bogdanpeltea/Desktop/scout-task-manager && npx vite build 2>&1 | tail -5
```

Expected: `✓ built in ...`. If you see "unexpected token", inspect the inserted block — JSX is brittle around inline `{(function() { ... })()}` blocks; make sure parens and braces all close.

- [ ] **Step 4: Smoke test the production build locally**

Run:
```bash
cd /Users/bogdanpeltea/Desktop/scout-task-manager && npx vite preview --port 4173 &
sleep 2
curl -sS http://localhost:4173/ | grep -oE 'index-[A-Za-z0-9_-]+\.js' | head -1
```

Then in a browser, log in as Bogdan (`bogdan / bogdan2026`), navigate to Concedii, and confirm:

- The new "Calendar echipa" card appears above the user picker.
- Each member is a row, each day a column.
- Today's column has a green underline + tinted background.
- Weekend columns are slightly gray.
- Leave days are filled with the member's color (e.g., Mara's leave days = blue).
- Click a member's row — the per-user calendar below switches to that member.
- Month-nav arrows in the new card update BOTH the team grid and the per-user calendar below.

Kill the preview server when done:
```bash
pkill -f "vite preview" || true
```

---

## Task 4: Mobile responsive treatment

**Files:**
- Modify: `src/App.jsx` — adjust the new card to render properly on narrow viewports.

The card already uses `overflowX: "auto"` and `WebkitOverflowScrolling: "touch"` in Task 3, so it scrolls horizontally on mobile. This task verifies and tightens the mobile experience.

- [ ] **Step 1: Check the sticky name column actually stays sticky during scroll**

The `position: "sticky"` on the name cell needs an explicit `background` (set in Task 3 — `#fff` or `#F0FDF4`) and a containing scroll context. Verify by:

```bash
cd /Users/bogdanpeltea/Desktop/scout-task-manager && npx vite preview --port 4173 &
sleep 2
```

Then in browser DevTools, switch to a mobile viewport (375x812 iPhone SE), navigate to Concedii, scroll the team grid horizontally. The name column should stay pinned on the left edge.

If it doesn't stay pinned, the most common cause is that `overflowX: "auto"` is on the wrong container. The scroll container must be the `<div style={{ overflowX: "auto" }}>` that wraps the entire grid (already done in Task 3). Sticky cells get pinned within that scroll context.

- [ ] **Step 2: Adjust the name column width on narrow screens**

Use the Edit tool on `src/App.jsx`. Find the two `gridTemplateColumns: "140px repeat(...)"` strings inserted in Task 3 and replace them with a responsive value. We'll inline a check based on `isMob` — but `LeavesPage` doesn't receive `isMob` as a prop currently.

First confirm the prop list:

```bash
grep -n "function LeavesPage" /Users/bogdanpeltea/Desktop/scout-task-manager/src/App.jsx
```

Expected: line 6170 prints
```
function LeavesPage({ leaves, setLeaves, leaveRequests, setLeaveRequests, team, user, visUsers, me, addLog, addNotif, pmTeamMembers }) {
```

- [ ] **Step 3: Pass `isMob` into LeavesPage**

Find the render call (currently around line 2874) and add `isMob={isMob}` to the props.

Use the Edit tool:

Old:
```js
          {page === "leaves" && <LeavesPage leaves={leaves} setLeaves={setLeaves} leaveRequests={leaveRequests} setLeaveRequests={setLeaveRequests} team={team} user={user} visUsers={visUsers} me={me} addLog={addLog} addNotif={addNotif} pmTeamMembers={pmTeamMembers} />}
```

New:
```js
          {page === "leaves" && <LeavesPage leaves={leaves} setLeaves={setLeaves} leaveRequests={leaveRequests} setLeaveRequests={setLeaveRequests} team={team} user={user} visUsers={visUsers} me={me} addLog={addLog} addNotif={addNotif} pmTeamMembers={pmTeamMembers} isMob={isMob} />}
```

- [ ] **Step 4: Accept `isMob` in the function signature**

Use the Edit tool:

Old:
```js
function LeavesPage({ leaves, setLeaves, leaveRequests, setLeaveRequests, team, user, visUsers, me, addLog, addNotif, pmTeamMembers }) {
```

New:
```js
function LeavesPage({ leaves, setLeaves, leaveRequests, setLeaveRequests, team, user, visUsers, me, addLog, addNotif, pmTeamMembers, isMob }) {
```

- [ ] **Step 5: Tighten name column on mobile**

The two `gridTemplateColumns: "140px repeat(...)"` strings in the new card should narrow to `100px` on mobile.

Use the Edit tool, `replace_all: true` to hit both occurrences:

Old:
```js
gridTemplateColumns: "140px repeat(" + daysArr.length + ", minmax(0, 1fr))"
```

New:
```js
gridTemplateColumns: (isMob ? "100px" : "140px") + " repeat(" + daysArr.length + ", minmax(0, 1fr))"
```

Also update the `minWidth` calc and the sticky background:

Old:
```js
          <div style={{ minWidth: 140 + daysArr.length * 28 }}>
```

New:
```js
          <div style={{ minWidth: (isMob ? 100 : 140) + daysArr.length * (isMob ? 24 : 28) }}>
```

- [ ] **Step 6: Verify build + mobile smoke**

Run:
```bash
cd /Users/bogdanpeltea/Desktop/scout-task-manager && npx vite build 2>&1 | tail -5
```

Expected: `✓ built in ...`.

Then preview again and re-check 375x812 viewport. Name column should be narrower, day cells should still be visible without horizontal overflow on a single screen (if leaves span 30 days × 24px = 720px + 100px = 820px, slight scroll is fine — that's the design).

Kill preview:
```bash
pkill -f "vite preview" || true
```

---

## Task 5: Ship to production

- [ ] **Step 1: Final full-build verification**

Run:
```bash
cd /Users/bogdanpeltea/Desktop/scout-task-manager && npx vite build 2>&1 | tail -8
```

Expected:
```
dist/index.html                  0.34 kB │ gzip:   0.25 kB
dist/assets/index-XXXXXXXX.js  ~871 kB │ gzip: ~217 kB

(!) Some chunks are larger than 500 kB after minification. Consider:
...
✓ built in ...
```

The chunk-size warning is normal (existing repo state).

- [ ] **Step 2: Commit + push**

Run:
```bash
cd /Users/bogdanpeltea/Desktop/scout-task-manager && git add src/App.jsx && git commit -m "$(cat <<'EOF'
Add team leaves overview (Calendar echipa)

Members can now see Concedii. The page adds a team-wide month grid
above the existing per-user calendar showing every non-admin member
as a row with leave days filled in their personal color. Click a row
to drill into that member's full calendar below. Read-only for
everyone; edit/request flows unchanged. Month-nav arrows in the new
card drive both views in sync.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)" && git push origin main
```

- [ ] **Step 3: Confirm Vercel deploy**

Wait ~2 minutes, then:
```bash
curl -sS https://work-heyads.ro/ | grep -oE 'index-[A-Za-z0-9_-]+\.js' | head -1
```

This should print the new bundle hash (different from the build's `dist/assets/index-*.js` because Vercel rebuilds — what matters is it changes from the previous deploy).

Then verify the new code is in the live bundle:
```bash
NEW_HASH=$(curl -sS https://work-heyads.ro/ | grep -oE 'index-[A-Za-z0-9_-]+\.js' | head -1)
curl -sS "https://work-heyads.ro/assets/$NEW_HASH" | grep -c "Calendar echipa"
```

Expected: `1` or higher. If `0`, the deploy hasn't finished — wait another minute and retry.

- [ ] **Step 4: Browser-verify end-to-end**

Use Playwright via the plugin tool, or manually:

1. Open `https://work-heyads.ro` in incognito (force fresh bundle).
2. Log in as `angi / angi2026` (the member without explicit access — confirms the role-default fallback works).
3. Navigate to **Concedii** in the sidebar. Confirm:
   - The tab is now visible (previously hidden for angi).
   - The "Calendar echipa" card renders.
   - Angi's own row is highlighted as selected (or, if she has no leaves, the empty-state row is fine).
   - She can click another member's row and see their per-user calendar below.
   - Day cells with leave dates are filled in the member's color.
   - She cannot click leave cells in the per-user calendar (canDirectEdit is false for her).
4. Log out, log in as `bogdan / bogdan2026`. Confirm:
   - Concedii still works for admin.
   - Bogdan can still click cells in the per-user calendar to toggle leaves.
   - Pending requests card still appears if any are pending.
5. Log out, log in as `carla / carla2026`. Confirm:
   - Same as admin — can edit her team's leaves.
   - Can also see read-only calendars for Mara's team via the picker (new behavior).

- [ ] **Step 5: Done**

Report back with:
- Commit SHA + Vercel deploy confirmation.
- Screenshot of the new "Calendar echipa" card with at least one leave bar visible (if any data exists for the current month).

---

## Out of scope (do NOT add)

- Hover tooltip with reason text.
- Multi-month view.
- Showing pending (un-approved) leave requests in the team grid.
- Color-blind fallback patterns.
- Export.
