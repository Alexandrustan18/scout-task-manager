# Team Leaves Overview — Design

**Status:** Draft (2026-05-24)
**Author:** Bogdan + Claude

## Goal

Give every team member (admin, PM, member) a one-glance view of who is on leave each day, so they can plan without asking around. The existing per-user calendar stays in place for managing leaves.

## Current state

- `LeavesPage` (src/App.jsx ~6170) shows a per-user calendar that you navigate by selecting one person at a time.
- Members cannot reach the page at all — nav allow-list (line 2691) does not include `"leaves"`.
- Data: `leaves` is a blob row `{ userId: ["YYYY-MM-DD", ...] }`. Pending approvals live in `leaveRequests`. Approved leaves are merged into `leaves` on approve.
- Helpers: `isOnLeave(leaves, userId, date)` is the canonical check.

## Non-goals

- No new request/approval flow. Members keep submitting via "Cere concediu" (existing button), PMs/admin keep approving via the existing pending-requests card.
- No editing in the new team grid. View only.
- No schema or DB changes. Reads existing `leaves` blob.
- No multi-month, week, or quarter view in v1.

## UX

### Page layout (Concedii)

The page renders top-to-bottom:

1. Existing **"Azi in concediu"** badge row — unchanged.
2. **NEW: "Calendar echipa"** card — the team timeline.
3. Existing **"Cere concediu"** button + member request history (members only) — unchanged.
4. Existing **pending requests** card (admin/PM only) — unchanged.
5. Existing **per-user calendar** with user-picker on left, month grid on right — unchanged behavior, but the month state is now shared with the team timeline above (single `calMonth` state drives both).

### "Calendar echipa" card

- Header: month name (e.g., `Mai 2026`) + prev/next arrow buttons. Clicking arrows updates the shared `calMonth` and reflows both the team grid and the per-user calendar below.
- Grid:
  - Rows: every team member where `team[uid].role !== "admin"`, sorted alphabetically by name.
  - Sticky left column (~140px): avatar circle + name.
  - Day columns: one per day-of-month (28-31 columns). Weekday letter (L Ma Mi J V S D) above the day number in a tiny header row.
  - Weekend columns (S, D): subtle gray background (`#F8FAFC`).
  - Today column: highlighted with the app green accent (`GR + "20"` background, `GR` border on the header).
  - Each cell:
    - If `isOnLeave(leaves, uid, dateStr)` → filled rectangle in the member's color (`team[uid].color`). Adjacent leave days appear as one continuous bar (no inner borders between consecutive filled cells).
    - Else → empty/white background.
  - Cell height ~32px, width auto (responsive grid: `grid-template-columns: 140px repeat(<days>, minmax(0, 1fr))`).
- Hover on a leave cell: tooltip with `dateStr` (`title` attribute is enough — no JS tooltip lib).
- Click on a member row (anywhere in the row): selects that member in the per-user calendar below (`setSelectedUser`). No edit on the team grid itself.
- Empty state (no leaves anywhere in this month): show `"Niciun concediu in <month>"` placeholder text in the card.

### Permissions

- Add `"leaves"` to the member nav allow-list at `src/App.jsx:2691`.
- **Audit caveat:** the gate at line 2689 checks `me.access` *before* the role default. A check of the live `team` blob shows:
  - 5 members already have `"leaves"` in their explicit `access` (dana, denisa, teodora, alexandra, mara_poze) — no DB change needed.
  - 1 member (angi) has an empty `access` array — falls back to the role default, so the code change at line 2691 alone unblocks her.
  - Both PMs already have `"leaves"` in their access (Mara, Carla).
  - No DB-config writes required for this feature. (Same shape as the `teamReport` rollout last week, except we got lucky and don't need to top up access arrays.)
- The team grid is read-only for everyone. Edits continue to happen only in the existing per-user calendar, gated by the existing `canDirectEdit` (admin or PM).
- Members already could submit requests through the "Cere concediu" button — that stays.

### Mobile (`isMob`)

- Card scrolls horizontally; the left name column is sticky (`position: sticky; left: 0;` with a `background: #fff` and a `box-shadow` on the right edge).
- Day columns get a fixed `min-width: 28px` so they don't squish below readability.
- Hide the prev/next "Calendar echipa" header label text on narrow screens, keep just the arrows + month.

## Color rationale

Leave cells render in `team[uid].color` (e.g., Mara = `#2563EB`, Carla = `#DB2777`). Rationale:

- Visual continuity with avatars, league cards, and the rest of the app.
- Bars belonging to the same person scan as one block of color across days, making it easier to track "who is out when" by hue.
- Universal orange (used in "Azi in concediu" badges) would be cleaner-looking but loses the at-a-glance per-person attribution.

**Fallback when `team[uid].color` is missing/undefined:** use `#94A3B8` (the slate-gray fallback already used elsewhere in the page, e.g. line 6286 / 6325).

**Per-user calendar stays orange:** the existing per-user calendar below the team grid keeps its `#D97706` solid-orange leave cells. Different visual language is intentional — the per-user view's job is to show one person's leave *pattern*, the team view's job is at-a-glance attribution across many people. Mixing colors in the per-user view would clutter it.

**Visual treatment for today highlighting:** match the existing per-user calendar — `GR + "20"` background on the today column, `GR` border on the today column's header cell. Reuses the same `GR` constant.

**Weekend treatment:** match the existing per-user calendar — `#F8FAFC` background on weekend columns, `#94A3B8` text for the weekday label.

## State changes

- `LeavesPage` already owns `calMonth` (line 6173). Reuse it — both the team grid and per-user calendar read from this same state.
- One new constant inside the component: `viewableUsers = Object.keys(team).filter(u => team[u] && team[u].role !== "admin").sort((a,b) => (team[a].name||"").localeCompare(team[b].name||""))`. This is the row-source for the team grid **and** the row-source for the existing per-user picker (so members can browse the read-only calendar of any teammate, not just themselves). The existing `editableUsers` is no longer needed — permission gating is already enforced inside `toggleDate` via `canEditUser(selectedUser)`, so non-editable users simply can't click cells.
- `todayOnLeave` (currently filters by `editableUsers`) switches to filter by `viewableUsers` so members see *everyone* who's out today, not just themselves.
- The initial value of `selectedUser` (line 6172) uses `visUsers`, which for a member returns just themselves. Change it to default to `user` if `user` is in `viewableUsers`, else fall back to `viewableUsers[0]`. (Admins land on the alphabetically-first member as today; members and PMs land on themselves.)
- Reuse the existing `MN` months array (used at line 6337) for the team grid header — no new constant.

## Files touched

- `src/App.jsx` only:
  - Line ~2691: add `"leaves"` to the member nav allow-list.
  - Inside `LeavesPage` (~6170): introduce `viewableUsers`, replace `editableUsers` references (lines 6255, 6320), update `selectedUser` default (line 6172), insert the new "Calendar echipa" card before the existing 2-column grid (after line 6315, before line 6317).

No new files. No DB writes. No new props down the tree.

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Sharing `calMonth` accidentally breaks the existing per-user calendar arrows | Low | Both arrow handlers already do `setCalMonth(...)` — already shared via state. No-op refactor. |
| Members see leave dates they shouldn't (privacy) | Low | Leaves are not sensitive in this org — Bogdan confirmed the request is to make them visible to everyone. |
| Mobile sticky column breaks on Safari iOS | Low | `position: sticky` with `background` and `z-index` works on iOS 13+. Tested pattern. |
| The grid bloats the page for users with no leaves in the month | Low | Card renders the placeholder string instead of an empty grid. |
| PM `team` array references a user no longer in the `team` blob (e.g., Carla.team contains `"sonia"` but `team["sonia"]` is undefined — confirmed in the live config) | Low | The new `viewableUsers` filter uses `team[u] && team[u].role !== "admin"`, which drops orphan references. The existing per-user picker already does the same. No additional handling needed. |
| Members with empty access arrays don't pick up the new tab (only angi today) | Low | The line 2691 fallback drives angi. Other members already have `"leaves"` in their explicit access. No DB writes required. |
| `team[uid].color` not set for any user → leave cells invisible | Very low | All 10 users in the live config have a `color` field set. Code falls back to `#94A3B8` anyway. |

## Success criteria

- Carla, Mara, and any member account (e.g., Dana, Alexandra) can navigate to `Concedii` and see the team grid.
- Clicking a member's row in the team grid scrolls to and selects that member in the per-user calendar below.
- Month arrows in the team grid update both the team grid and the per-user calendar's month in lockstep.
- Existing edit/request flows continue to work exactly as before.
- Mobile renders the timeline with a horizontally scrolling grid and a sticky name column.

## Out of scope (deferred)

- Hover tooltip with reason text (would require reading `leaveRequests` to find the matching reason — extra complexity for v1).
- Multi-month view, configurable date range.
- Color-blind-friendly fallback patterns (stripes/hatching). The app already uses per-member color elsewhere with no complaints.
- Export to PDF / image.
- Showing pending (un-approved) leave requests in the team grid.
