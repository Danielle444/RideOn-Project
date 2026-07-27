---
id: SPEC-shavings-page-redesign
companions:
  - component-structure.md
  - read-model.md
  - sla-rules.md
  - add-order-form.md
  - hebrew-labels.md
  - spec-1-dependencies.md
  - ../spec-shavings-order-backend/spec-2-handoff.md
  - ../spec-shavings-order-backend/state-machine.md
sources:
  - ../../shavings-redesign/shavings-data-layer-map.md
  - ../spec-shavings-order-backend/SPEC.md
---

> **Canonical contract.** This SPEC and the files in `companions:` are the complete, preservation-validated contract for what to build, test, and validate. Source documents listed in frontmatter are for traceability only — consult them only if you need narrative rationale or prose color this contract intentionally omits.

# Spec 2 — Shavings Page Redesign (Secretary Web)

## Why

**A pain to solve.** Spec 1 (`spec-shavings-order-backend`) is **merged to `main` and deployed** (merge `d9c3701`; `origin/main` at `eb369c1`). It killed delivery approval end-to-end and left the secretary's shavings page a neutral placeholder (`CompetitionShavingsPage.jsx`) with an emptied service (`shavingsOrderService.js` is `export {}`). The secretary now has no place to see the shavings orders for a running competition, no way to spot a delivery that is stalling, and no web form to add an order (only the mobile admin app can). This spec builds the page on Spec 1's shipped `Pending → Seen → Delivered` model: every order for the competition, grouped by participating ranch or by status (#29), delayed orders flagged at a glance (#30), and a secretary add-order form with a mandatory ranch (#32). It is the frontend/UX half of the redesign; the data layer, procs, worker-mobile, and approval removal are Spec 1 (done), and notification push (#31/#46) is out of scope. Branch Spec 2 off **current `origin/main`**.

## Capabilities

- **CAP-1 — All-orders page replacing the placeholder**
  - **intent:** The secretary opens one page and sees every shaving order for the competition (across all participating ranches).
  - **success:** The page renders each order for the active competition with its derived status, bags, delivery time, and pricing; no approve button, photo-approval card, or approval call exists; `npm run build` is clean and the emptied approval service is not reintroduced.

- **CAP-2 — Ranch ⇄ Status grouping toggle in URL state (#29)**
  - **intent:** The secretary can flip the same order list between grouping by **participating ranch** and by **order status** (`Pending → Seen → Delivered`), and the choice survives a reload or shared link.
  - **success:** A toggle switches the grouping; `?group=ranch|status` (and any active ranch/status filter) is written to and restored from the URL via React Router `useSearchParams`; the same master order list re-groups with no refetch; ranch grouping is driven by the summary rollup and status grouping by client-side bucketing on the **derived** status.

- **CAP-3 — Order rows render Spec 1's derived lifecycle (#29)**
  - **intent:** Each row shows where the order is in the pipeline — created, seen by a worker, delivered — with no trace of approval.
  - **success:** Rows show a `Pending`/`Seen`/`Delivered` chip computed by the derived-status rule (Delivered if `Delivered` set; else Seen if `WorkerSystemUserId` set; else Pending — never the stored token alone) plus created / seen / delivered timestamps; nowhere does the page surface approval fields, an approve action, or a `WaitingApproval`/`Closed` state.

- **CAP-4 — SLA delay flagging (#30)**
  - **intent:** The secretary spots a stalling order without reading every row — one never picked up soon after creation, or picked up but not delivered soon after.
  - **success:** Two rules keyed on a single named constant `SHAVINGS_SLA_THRESHOLD_HOURS = 3` flag delayed orders — (A) `WorkerSystemUserId` null and `now − PrequestDatetime > threshold`; (B) `WorkerSystemUserId` set, `Delivered` null, `now − Seen > threshold` (legacy `Seen`-null rows fall back to `PrequestDatetime`); a flagged order is both highlighted in-row and pinned into a dedicated "needs attention" (דורש טיפול) section; the threshold appears exactly once as the constant.

- **CAP-5 — Secretary add-order form with mandatory Ranch (#32)**
  - **intent:** The secretary creates a shavings order from the web, choosing a ranch explicitly and then the stalls under it.
  - **success:** A form mirroring the mobile admin add-order flow (price-catalog selection, delivery now/later, equal-or-per-stall bag quantity, multi-stall selection, notes) with a **required Ranch dropdown** that scopes the pickable stalls via `getStallBookingsForShavings(competitionId, ranchId)` and the price via `getServicePricesDashboard(ranchId)`; submitting posts to the existing `POST /api/ShavingsOrders` (already authorizes `HostSecretary`) and the new order appears on refresh; submitting with no ranch is blocked with a Hebrew message.

- **CAP-6 — Loading / empty / error / degenerate states**
  - **intent:** The page behaves deliberately when data is loading, absent, failing, or reduces to a single participating ranch.
  - **success:** Distinct loading, empty ("no orders"), and error affordances reusing the summary page's visual treatment; with one participating ranch (today's live reality) ranch grouping collapses to a single group cleanly rather than showing an empty or broken toggle; the needs-attention section is omitted when nothing is delayed.

## Constraints

- **Consume Spec 1's shipped contract; author no new stored procedures.** Status is **derived, not a stored token** — stored `deliverystatus ∈ {Pending, Delivered}` only; the display/group state is Delivered if `Delivered` set, else Seen if `WorkerSystemUserId` set, else Pending. Never group or label on the stored token alone. Web reaches the API only through the shared `axiosInstance` → controller → BL → DAL → proc chain.
- **The SLA-bearing per-order read is `usp_getshavingsordersforcompetitionandranch` (#176), deployed, scoped to one participating ranch.** Ranch enumeration and group-header rollups come from `usp_getcompetitionsummaryshavingsdetails` (#172); the page loops the order read per participating ranch. Build generically for N ranches even though live data has one participating ranch per competition today (all Double K). See `read-model.md`.
- **"Ranch" here means the participating ranch the horse belongs to** (`stallbooking.ranchid`, surfaced by the summary procs as BookingRanch), not the host/venue ranch. In all current data it equals the host ranch, so grouping shows one group; it is built to render N.
- **Approval is gone.** No approval fields, approve button, approval queue, or `WaitingApproval`/`Closed`. Spec 1 emptied the web approval service; Spec 2 must not reintroduce it.
- **RTL Hebrew, Tailwind CSS v4, React Router v7.** Reuse the competition-summary visual language (`SummaryTable`, `SummaryAmountCards`, `CompetitionSummarySection` palette and card shapes) so the page reads as native — no default/template look. The Hebrew string set is `hebrew-labels.md`, pending Oren's approval.
- **Verify in the browser preview** (web dev server, `npm run dev`, `localhost:5173`) and attach screenshots of the ranch view, the status view, and a flagged-delayed order as proof.

## Non-goals

- **The data layer, stored procedures, worker-mobile app, and approval removal** — all Spec 1, shipped. Spec 2 designs UI and consumes fields.
- **Notification push (#31/#46)** — no transport exists; out of scope.
- **Authoring any new stored procedure.** The one backend gap (CAP-3's unverified marker needs `DeliveryPhotoUrl` on #176) is recorded as DEP-1 in `spec-1-dependencies.md` — a scoped decision, not open-ended SQL.
- **Enabling shavings orders for participating ranches that have no active shavings price** — a pricing-setup dependency (only the host ranch is priced today), out of scope.
- **Reworking the billing/charge split** inside `usp_createshavingsorder`, and **deep order-detail drill-down** beyond a basic row expand — optional/out for v1.

## Success signal

Mid-competition, the secretary opens the shavings page, sees every order grouped by status, and immediately spots the two orders pinned in "needs attention" — one never picked up in over three hours since it was created, one picked up over three hours ago but still not delivered. She flips the toggle to ranch grouping, confirms the per-ranch counts, then adds a new order scoped to a ranch's stalls — with no approval step anywhere, and the new order shows up in the list.

## Assumptions

- `hostRanchId` for the reads = `activeRole.ranchId` (the secretary's host ranch), identical to the competition-summary page; it scopes the competition in #172/#173 (which validate `c.hostranchid`) and is the default participating ranch for the order loop. Booking/participating ranch equals host ranch on current data.
- Legacy rows with `WorkerSystemUserId` set but `Seen` null (pre-Spec-1 migration) are rare test rows; Rule B falls back to `PrequestDatetime` for them.

## Resolved decisions (Oren, 2026-07-26)

- **DEP-1 (unverified marker) — ACCEPTED.** Do the minimal backend touch: append `DeliveryPhotoUrl` to #176 + DTO + DAL. Exact SQL and file changes in `spec-1-dependencies.md`.
- **#32 ranch dropdown scope — CONFIRMED.** Lists participating ranches that have both pickable stalls and an active shavings price (today only the host ranch); some organizer ranches lack prices and that is acceptable — enabling them is a deferred pricing-setup task.
- **Unverified action — CONFIRMED flag-only.** Spec 2 surfaces the flag on the row; no "request proof" affordance in v1 (depends on the out-of-scope notification track).

## Open Questions

- **Hebrew labels:** the string catalog in `hebrew-labels.md` is approved for the needs-attention section title/subtitle; the remaining chip/badge/form wording is proposed and open to your final edit.
