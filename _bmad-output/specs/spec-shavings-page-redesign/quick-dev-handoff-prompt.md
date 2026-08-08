# bmad-quick-dev kickoff prompt — Spec 2 (Shavings page redesign)

> Paste the block below into a fresh session. Branch off **current `origin/main`** (`eb369c1`).

---

/ride-on-system-knowledge
/ride-on-live-db-ops
/bmad-quick-dev

GOAL: run backend + web frontend, implement **Spec 2 — Shavings page redesign** (secretary web).
The canonical contract is `_bmad-output/specs/spec-shavings-page-redesign/SPEC.md` + its companions —
READ IT FIRST and build to it; do not re-derive. Spec 1 (`spec-shavings-order-backend`) is merged
(`d9c3701`) and DEPLOYED — consume its shipped reads/vocabulary; do NOT touch the data layer except the
one scoped DEP-1 change below. Notification push (#31/#46) is out of scope. Branch off current
`origin/main`; confirm no other session is mid-edit on `web/src/services/shavingsOrderService.js` or
`web/src/pages/secretary/CompetitionShavingsPage.jsx` (both are Spec-1 placeholders).

READ THESE COMPANIONS (all under `_bmad-output/specs/spec-shavings-page-redesign/`):
- `component-structure.md` — file plan, component tree, hook contract, web-service additions, states.
- `read-model.md` — derived status (never the stored token), R1/R2/R3 reads, per-participating-ranch loop, URL state.
- `sla-rules.md` — `SHAVINGS_SLA_THRESHOLD_HOURS = 3`, two clocks keyed on `WorkerSystemUserId`, needs-attention + in-row.
- `add-order-form.md` — #32 form mirror + required-ranch UX + price source (`getServicePricesDashboard`).
- `hebrew-labels.md` — the RTL string set (section title/subtitle Oren-approved; rest proposed).
- `spec-1-dependencies.md` — fields consumed from #176 + the **DEP-1 SQL/DTO/DAL** to apply.

BUILD ORDER (suggested):
1. **DEP-1 backend touch first** (per `spec-1-dependencies.md`): apply the DROP+CREATE for
   `usp_getshavingsordersforcompetitionandranch` (#176) appending `DeliveryPhotoUrl text` LAST; add
   `DeliveryPhotoUrl` to `CompetitionShavingsOrderListItem.cs`; add the `reader["deliveryphotourl"]`
   mapping in `ShavingsOrderDAL.cs`; update repo file `176_...sql` to match live. Live-DB discipline:
   the SQL is drafted from live `pg_get_functiondef`; show Oren the exact SQL, apply, re-read as proof.
   It is backward-compatible (appended column, DAL reads by name) so it can deploy independently.
   `dotnet build` in `RideOnServer/`.
2. **Web service** (`web/src/services/shavingsOrderService.js`, currently `export {}`): add
   `getShavingsOrdersForCompetitionAndRanch`, `createShavingsOrder`, `getStallBookingsForShavings`
   (mirror the mobile service + controller routes). Reuse existing `competitionSummaryService`
   (`getCompetitionSummaryShavingsDetails`/`Entries`) and `servicePricesService.getServicePricesDashboard`.
3. **Utils:** `shavingsStatus.utils.js` (`deriveShavingsStatus`), `shavingsSla.utils.js` (constant + rules),
   `shavingsGrouping.utils.js` (group-by-ranch / group-by-status pure fns).
4. **Hook + page + components** per `component-structure.md`. Grouping toggle + filters in URL via
   `useSearchParams` (default `group=ranch`).
5. **#32 add-order modal** per `add-order-form.md` (required ranch scopes stalls + price).

KEY GROUND-TRUTH GOTCHAS (do not relearn the hard way):
- **Status is DERIVED.** Stored `deliverystatus ∈ {Pending, Delivered}` only. `deriveShavingsStatus` =
  Delivered if `Delivered` set, else Seen if `WorkerSystemUserId` set, else Pending. Never group/label
  on the stored token — a claimed-undelivered order is stored `Pending` but shows `Seen`.
- **SLA keys on `WorkerSystemUserId`**, not status. Rule A: unclaimed & `now−PrequestDatetime>3h`.
  Rule B: claimed, `Delivered` null & `now−Seen>3h` (legacy `Seen`-null → fall back to `PrequestDatetime`).
- **"Ranch" = participating ranch** (`stallbooking.ranchid` = BookingRanch), not host. Enumerate via
  R1 (#172, host-scoped, all participating ranches); loop R2 (#176) per participating ranch. On live
  data there is one participating ranch per competition (all Double K) — build for N, degenerate to 1.
- **#32 ranch/price coupling:** create requires `pricecatalog.ranchid == p_ranchid` AND
  `sb.ranchid == p_ranchid`; only the host ranch is priced today. Dropdown = participating ranches with
  pickable stalls AND an active shavings price. Unpriced organizer ranches are acceptably excluded.
- **No approval** anywhere. Do not reintroduce the emptied approval service.

DB-CHANGE DISCIPLINE (DEP-1 — read before touching the proc):
- The `DROP FUNCTION` is ONLY the Postgres mechanism to change the return-`TABLE` shape (append a
  column); it is a **recreate, not a removal**. Recreate the SAME function with all 13 existing output
  columns **verbatim** + `DeliveryPhotoUrl` 14th. Before applying, diff the drafted body against live
  `pg_get_functiondef` and confirm the ONLY delta is that one column + its one SELECT line.
- **Do NOT drop/remove any column, DTO property, or DAL read because it "looks unused."** The stored
  `DeliveryStatus` token is superseded-for-display by the derived status but MUST stay (mobile reads it).
  Supersession ≠ obsolescence. If something genuinely looks obsolete vs the post-Spec-1 table, **FLAG it
  to Oren — do not drop it.** This change is additive only.
- **This proc is consumed by the DEPLOYED mobile admin app, not just the web page** — verify all
  consumers, do not break them (full list + line numbers in `spec-1-dependencies.md`):
  `ShavingsOrdersController.cs:219`, `ShavingsOrderDAL.cs:266`, `CompetitionShavingsOrderListItem.cs`,
  `mobile/src/services/shavingsOrderService.js:40`, `mobile/.../useAdminCompetitionShavings.js:177`,
  `mobile/.../useAdminCompetitionStallsOverview.js:379`. Append-last + read-by-name = backward-compatible.
- **Follow up thoroughly after any DB change:** (1) re-read live proc as proof of the new shape;
  (2) `dotnet build`; (3) re-grep the four identifiers and smoke-test the mobile admin shavings screen;
  (4) sync repo file `176_...sql` to live and commit it; (5) confirm `origin/main` is the deployed code
  (a local `dotnet run` is NOT proof of deploy). Every live write: show Oren exact SQL, apply, re-read.

VERIFY IN BROWSER PREVIEW (`web/`, `npm run dev`, localhost:5173): screenshot the **ranch view**, the
**status view**, and a **flagged-delayed order** as proof. `npm run build` clean; `dotnet build` green.
Show diffs before applying; feature branch off `origin/main`; do not merge without Oren's approval.
