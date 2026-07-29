# Change list — #28, #62, #52 (exact anchors)

All paths under `RideOnClient/rideon-client/web/src/`. Verified against repo source
2026-07-29. Re-confirm line numbers on open.

---

## CAP-2 · #28 — dead duplicate "הוסף תא" button

**File:** `pages/secretary/CompetitionStallsPage.jsx`

Two add-stall buttons exist:

- **DEAD (remove):** lines **198-206** — a permanently `disabled` button in the
  header action row, styled greyed (`cursor-not-allowed`, `text-[#BCAAA4]`,
  `bg-[#F7F1ED]`), `title="יפותח בהמשך"`, label `הוסף תא`. Does nothing.
- **WORKING (keep):** lines **224-232** — `+ הוסף תא`, `onClick` →
  `setCreateModalOpen(true)`, rendered inside the `page.mode === "overview"` block.

**Change:** delete the disabled button (198-206).

**Follow-through:**
- The `Plus` icon import (line **16**) is used by the dead button. After removal,
  check whether `Plus` is still referenced elsewhere in the file — grep shows it
  only on the dead button, so **remove the `Plus` import** too, or lint will flag an
  unused import.
- Minor UX note (no action required, just awareness): the working button lives only
  inside the overview block, so in assignment mode there is now no add-stall button
  at all. That matches the current working behavior; do not add one.

---

## CAP-3 · #62 — summary income/paid-unpaid overflow

**File:** `components/secretary/competition-summary/SummaryAmountCards.jsx`

Root cause (read): the amount cards are grid items (`grid md:grid-cols-3/4`,
lines 37-42). Each card is a `<button>` (`AmountCard`, lines 11-28) whose figure is
`text-3xl font-black` (line 23). Grid items default to `min-width: auto`, so a long
figure (e.g. `₪1,234,567`) cannot shrink below its content width — it overflows the
track and can push the whole row past the viewport → horizontal page scroll.
Affected cards: `סה״כ הכנסות צפויות` (income, :52-57), `שולם בפועל` (paid, :59-64),
`לא שולם` (unpaid, :66-70).

**Change (responsive containment — pick the minimal combination that holds):**
- Add `min-w-0` to the grid item / card so it can shrink within its track.
- Let the figure wrap or scale: e.g. responsive size `text-2xl md:text-3xl`, and/or
  `break-words` / `tabular-nums` on the figure `<p>`. Avoid `whitespace-nowrap`.
- Keep the card a `<button>` and keep the click affordances (`onClick`, disabled
  state) unchanged.

**Verify (CAP-3 success):** at 320 / 375 / 768 / 1024 / 1440 px the figures stay
inside their cards and the page has no horizontal scroll. Use large sample values
(7+ digit ₪) when checking.

**Do NOT** touch the `totals.expectedAmount || totals.ExpectedAmount` dual-casing in
this file (lines 54, 61, 68) — #52 is change-tracking only; this file is out of #52
scope. Leave it.

---

## CAP-4 · #52 — change-tracking dead casing + `buildChangedFields` de-dup

Three files carry a defensive `getValue(item, camelKey, pascalKey, fallback)` that
prefers a camelCase key then falls back to PascalCase. The API returns **consistent
PascalCase** (verified against the deployed change-tracking read procs in
system-knowledge). The camelCase branch is dead.

### C4a — extract the shared helper cluster
**Target util (already exists):** `utils/changeTracking.utils.js`

Move the byte-identical cluster — `buildChangedFields` **plus its private helpers**
`splitDetailsText`, `getDetailLabel`, `getDetailValue` — into
`changeTracking.utils.js` and `export` `buildChangedFields`. It is currently
duplicated in:
- `components/secretary/change-tracking/ChangeRequestsTable.jsx:54-142`
- `components/secretary/change-tracking/ChangeRequestDetailsModal.jsx:51-139`

Both copies are identical except a comment on the money-skip block ("line below" vs
"cards below") — the logic is the same; one shared copy is fine (use a neutral
comment). Import it in both consumers and delete the local copies.

### C4b — remove the dead camelCase half
After extraction, the values fed to `buildChangedFields` and rendered come via
`getValue(item, camel, pascal, fallback)`. Since the payload is PascalCase, replace
`getValue(item, "camelKey", "PascalKey", fb)` with a direct PascalCase read
(a small `pick(item, "PascalKey", fb)` helper, or just `item.PascalKey ?? fb`).
Remove the camelCase key argument entirely.

Sites, per file:
- **`ChangeRequestsTable.jsx`** — `getValue` def (14-28); call sites throughout
  `getRequestKey` (46-52), `ChangeSummary` (147-158), and the row map (288-331).
  ~20 call sites.
- **`ChangeRequestDetailsModal.jsx`** — `getValue` def (11-25); `getRequestKey`
  (43-49), `ChangeSummaryBox` (153-163), and `DetailRow` values (263-323).
- **`hooks/secretary/useCompetitionChangeTrackingPage.js`** — `getValue` def
  (33-47); `getRequestId` (49-51), `getRequestSource` (53-55); and two spots that
  hand-probe both cases:
  - `getRequestSearchText` (61-81) — the 14-entry array pairs `x`/`X` for 7 fields;
    reduce to the 7 PascalCase keys.
  - `loadPendingCount` (176-177) — `response.data?.pendingCount ||
    response.data?.PendingCount` → keep only `PendingCount` (confirm the count
    endpoint's casing; it is served by `usp_gethostsecretarypendingchangecount`
    via the API — PascalCase like the rest).

**Behavior must not change.** This is pure dead-code removal + one extraction. After
it: zero `camelKey` references in the three files, one `buildChangedFields`, and the
change-tracking page renders identically.

**Note (not in scope, flag only):** the same three files also duplicate `formatMoney`
/ `formatDate` / `getRequestKey`. #52 as scoped names only `buildChangedFields`; do
not expand into a broader refactor unless Oren asks — record it as a follow-up.

---

## Build / verify note (applies to all four capabilities)

- Web only. From `RideOnClient/rideon-client/web`: `npm run build` then
  `npm run lint`. Both must be clean; no new lint warnings from removed imports
  (`Plus` in #28, local helpers in #52).
- No server build, no proc, no DB. `dotnet` is not involved.
- Auth-gated pages cannot be self-verified by Claude Code — for a visual pass use
  Claude-in-Chrome on Oren's logged-in session, or a temporary `_devtest` harness
  route for the responsive #62 check (see system-knowledge "UI Investigation
  Pattern"; clean up the harness after).
