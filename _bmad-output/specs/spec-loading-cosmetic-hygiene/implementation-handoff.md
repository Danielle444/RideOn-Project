# Implementation handoff — Spec 2 (loading-vs-missing + #28/#62/#52)

Paste the block below into a fresh Claude Code session opened in the RideOn repo.
It is self-contained. Everything it references is live:
- Skill `ride-on-system-knowledge` is **globally installed** (required).
- The spec + companions are committed on the pushed branch
  **`origin/spec/loading-cosmetic-hygiene`** (= `main` + the 4 spec docs), so step 1
  puts them in your checkout.
- `bmad-quick-dev` is a repo-local skill — **optional**; the prompt does not require
  it.

---

## IMPLEMENTATION PROMPT (paste into a new Claude Code session)

**GOAL:** Implement "Spec 2 — loading-vs-missing cohesion + cosmetic (#28, #62) +
change-tracking hygiene (#52)" for the RideOn web admin app, **exactly as specified**,
frontend-only, and finish with `npm run build` and `npm run lint` green. This is a
cohesion/cleanup pass — **no product decisions, no new features, no backend.**

### Step 1 — create the implementation branch FIRST (do this before anything else)
```bash
git fetch origin
git checkout -b feature/loading-cosmetic-hygiene origin/spec/loading-cosmetic-hygiene
```
This bases your work on `main` plus the spec docs. Confirm the spec is present:
`ls _bmad-output/specs/spec-loading-cosmetic-hygiene/` — you should see `SPEC.md`,
`empty-state-sites.md`, `change-list.md`, `hebrew-copy.md`.

### Step 2 — load context
- Invoke the global skill **`ride-on-system-knowledge`** (system facts; do not
  re-derive them).
- Read the contract, in order: `SPEC.md`, then `empty-state-sites.md`,
  `change-list.md`, `hebrew-copy.md` in that spec folder. Treat their file+line
  anchors as verified-as-of-2026-07-29; **re-confirm line numbers on open** before
  editing (the repo may have moved).
- Working rules: investigation-first, read-before-write, **show diffs before
  applying**, mark read-vs-inferred, flag any anchor that has drifted instead of
  silently fixing.

### Step 3 — do the work (four capabilities, per the spec)

1. **CAP-1 — loading-vs-missing 3-state.** Apply the standard from
   `empty-state-sites.md` (reference impl: `CompetitionsTable.jsx:256-263`). For each
   **Tier A** site (no loading gate → flashes "missing") thread a `loading` prop and
   add the shared 3-state; for **Tier B / M** sites swap hand-rolled markup to the
   shared `DataTableLoadingState` / `DataTableEmptyState` (or `LoadingSpinner` for
   page-level lists). **Open each enumerated file and confirm its tier before
   editing** — the grep-based `(prior)` tags are hints, not proof. Do **not** touch
   the **Tier C** list (dropdowns/search-empties/per-field/error banners). Keep any
   action-bearing empty intact (e.g. `ChangeRequestsTable` filter-empty with its
   "ניקוי סינון" button). Keep every table's `colSpan` equal to its visible column
   count.
2. **CAP-2 — #28.** Remove the dead disabled duplicate "הוסף תא" button in
   `pages/secretary/CompetitionStallsPage.jsx` (the greyed `disabled` one,
   `title="יפותח בהמשך"`); keep the working one that opens the create modal. Remove
   the now-unused `Plus` import. Anchors in `change-list.md`.
3. **CAP-3 — #62.** Fix the summary amount-card horizontal overflow in
   `components/secretary/competition-summary/SummaryAmountCards.jsx` responsively
   (`min-w-0` + let the figure wrap/scale). Verify no horizontal page scroll and no
   clipped figure at 320 / 375 / 768 / 1024 / 1440 px with 7-digit ₪ values. Anchors
   in `change-list.md`.
4. **CAP-4 — #52.** In the three change-tracking files, remove the dead camelCase
   half of `getValue(camel || pascal)` (API is PascalCase) and extract the
   byte-identical `buildChangedFields` cluster into the **existing**
   `utils/changeTracking.utils.js`, imported by both consumers. Behavior must not
   change. Exact sites in `change-list.md`.

### Step 4 — Hebrew copy
The safe default **changes no user-visible wording** (existing strings pass through
the `message` prop). If you decide to change any Hebrew string, **stop and surface it
to Oren** — see `hebrew-copy.md` for the only two optional questions (generic vs
specific loading text; normalizing `אין…`/`לא נמצאו…`). Do not invent or alter Hebrew
copy unilaterally.

### Scope guardrails (do NOT cross)
- **Frontend only.** No `.cs`, no stored procs, no DB, no `dotnet`.
- **Do NOT touch #20** (classes-tab entry counts) — it is a separate backend proc
  gap, not a loading bug.
- Out of scope: error/validation cohesion, backend date-filter, web `<button>`
  cohesion, mobile. Reuse existing primitives — build no new components.

### Step 5 — verify & finish
```bash
cd RideOnClient/rideon-client/web
npm install
npm run build
npm run lint
```
Both must be clean, with **no new lint warnings** from removed imports/helpers.
Auth-gated pages can't be self-verified headless — for the #62 responsive check use a
temporary `_devtest` harness route (see the "UI Investigation Pattern" in
`ride-on-system-knowledge`) and remove it afterward, or verify via Claude-in-Chrome on
a logged-in session.

Commit per capability (keep the #52 behavior-neutral cleanup separable). Report the
commit hashes, which files changed, and any spec anchor that had drifted. Do **not**
merge to `main` or delete any branch without Oren's explicit approval.

**Done when:** every enumerated data-fetch surface shows a loading state (never
"missing") while its fetch is in flight; the stalls page has exactly one working
add-stall button; the summary cards don't overflow from 320px up; the change-tracking
files have one `buildChangedFields` and zero `camelKey` lookups with unchanged
behavior; `npm run build` + `npm run lint` pass clean.
