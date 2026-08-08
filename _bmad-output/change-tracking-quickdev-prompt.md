# bmad-quick-dev Handoff — Change Tracking Polish (paste into a new session)

/ride-on-system-knowledge /ride-on-live-db-ops /bmad-quick-dev

## Goal
Implement `SPEC-change-tracking-improvements` — the pre-committee polish + two functional fixes for the secretary-web Change Tracking page (מעקב שינויים). Ship all 11 capabilities so that at the committee demo the page shows only actionable Pending requests (no paid "zombie" rows, no English error leak), fully coherent Hebrew labels/status, a type filter that includes product requests, and a confirmation before either Approve or Reject — with the pending badge matching what's on screen.

## Read first (the contract)
- `_bmad-output/specs/spec-change-tracking-improvements/SPEC.md` — kernel, 11 capabilities (CAP-1…CAP-11), constraints, non-goals.
- `_bmad-output/specs/spec-change-tracking-improvements/backend-changes.md` — exact verified proc SQL deltas (CAP-1) + type-filter fix location (CAP-2).
- `_bmad-output/specs/spec-change-tracking-improvements/hebrew-strings.md` — every string with file:line anchor and its APPROVED replacement (ship exactly as written).
- `_bmad-output/change-tracking-followups.md` — explicitly deferred (do NOT build).

## Hard constraints (from the spec + project rules)
- The 4 change-tracking procs are **LIVE-ONLY (not in the repo).** Re-verify each live body via Supabase MCP (`pg_get_functiondef`, project `sxplumrexbolpwqacpiz`) immediately before editing — they may have drifted since 2026-07-27.
- **CAP-1 hide-filter must mirror the answer procs' exact paid definition** (`billcharge.chargestatus='Paid'`, keyed by `sourcetype`/`sourceid`), be **Pending-scoped** in the list proc (keep answered history), and applied identically in the count proc. It's a pure `WHERE` addition — no column/type change, no `DROP FUNCTION`, `CREATE OR REPLACE` is safe.
- Answer-proc `P0001` paid-guards **stay** as backstop (CAP-1 is defense-in-depth).
- **Every DB write shown to Oren as exact SQL, confirmed before running, re-read after.** Then commit the applied SQL to the repo — these procs have no committed `.sql` today, so create files under `RideOnDB/StoredProcedures/PostgreSQL/Individual/` (match existing numbering) with Oren.
- After any `.cs` change: `dotnet build` in `RideOnServer/` + grep for bypass call paths. (Expect frontend + DB-proc only; a `.cs` edit is likely only if CAP-4's error mapping reaches the controller/BL.)
- Hebrew RTL throughout. Do NOT redo already-shipped uncommitted polish (ToastMessage, reworded approve/reject copy, de-duped money line) — build on top of it.

## Suggested build order
1. **CAP-2** (type-filter fix, frontend only) — smallest, unblocks correct filtering. `ChangeRequestsFilters.jsx` + `useCompetitionChangeTrackingPage.js`: filter on `IsCancelled`, not the hardcoded `'שינוי מקצה'`/`'ביטול מקצה'` string.
2. **CAP-1** (backend, both procs) — verify live → show SQL → apply → re-read → commit to repo. Test against a real paid Pending request if one exists; else confirm the predicate logic by inspection + a synthetic check.
3. **CAP-3 / CAP-4** (English leaks) — extract the table's status translator to a shared helper; wire the modal + the hook's error catch to Hebrew.
4. **CAP-5** (labels + harmonized phrasings) — apply the string catalog verbatim.
5. **CAP-6 → CAP-11** (empty state, Approve+Reject confirmations, per-button spinner, RTL date order, post-start full-charge label, summary consolidation).

## Verify
- Frontend: `preview_start` `web` only (never `server`); Oren runs the backend himself. Claude cannot log in — use Claude-in-Chrome against Oren's session, or a `_devtest` harness for states real data can't produce (clean up after).
- Non-goals (do not touch): block-at-mobile-creation, refund/edge handling, camelCase dual-casing cleanup, `buildChangedFields` extraction, pagination, broader a11y.

## Done = 
All 11 CAP success criteria demonstrable; `dotnet build` clean (touched files warning-free); applied proc SQL committed to repo; diffs shown before applying.
