---
id: SPEC-shavings-page-redesign
companions:
  - component-structure.md
  - read-model.md
  - sla-rules.md
  - add-order-form.md
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

**A pain to solve.** The secretary's "shavings" page (`CompetitionShavingsPage.jsx`) today is not an orders page at all — it is the delivery **approval queue**, and Spec 1 is deleting the approval stage end-to-end (the queue happened weeks late or never; orders sat in `WaitingApproval` forever). Once Spec 1 lands, that page has no reason to exist. The secretary has no single place to see the shavings orders for a running competition, no way to spot a delivery that is stalling, and no web form to add an order (only the mobile admin app can). This spec rebuilds the page as an all-orders view on Spec 1's honest `Pending → Seen → Delivered` vocabulary: every order for the competition, grouped by ranch or by status (#29), with delayed orders flagged at a glance (#30) and a secretary add-order form with a mandatory ranch (#32). It is the frontend/UX half of the redesign; the data layer, procs, worker-mobile changes, and approval removal are Spec 1, and notification push (#31/#46) is out of scope. It consumes what Spec 1 defines and designs no data layer of its own.

## Capabilities

- **CAP-1 — All-orders page replacing the approval queue**
  - **intent:** The secretary opens one page and sees every shaving order for the competition (across all booking ranches), instead of only deliveries awaiting an approval that no longer exists.
  - **success:** The redesigned page renders each order for the active competition with its status, bags, delivery time, and pricing; the old approve button, photo-approval cards, and `pending-approvals`/`approve-delivery` calls are gone; `npm run build` is clean and no code path references the deleted approval service.

- **CAP-2 — Ranch ⇄ Status grouping toggle in URL state (#29)**
  - **intent:** The secretary can flip the same order list between grouping by booking **Ranch** and grouping by **Order Status** (`Pending → Seen → Delivered`), and the choice survives a reload or shared link.
  - **success:** A toggle switches the grouping; `?group=ranch|status` (and any active ranch/status filter) is written to and restored from the URL via React Router `useSearchParams`; the same master order list re-groups without a refetch; ranch grouping is driven by the summary rollup and status grouping by client-side bucketing.

- **CAP-3 — Order rows render Spec 1's lifecycle vocabulary (#29)**
  - **intent:** Each row communicates where the order is in the honest pipeline — created, seen by a worker, delivered — and whether a delivery is photo-backed, with no trace of approval.
  - **success:** Rows show a `Pending`/`Seen`/`Delivered` status chip plus created / seen / delivered timestamps; a delivery with `Delivered` set and no photo shows an "unverified" (ללא תמונה) marker (derived, no stored column); nowhere does the page surface `ApprovedByPersonId`/`ApprovedAt`, an approve action, or a `WaitingApproval`/`Closed` state.

- **CAP-4 — SLA delay flagging (#30)**
  - **intent:** The secretary spots a stalling order without reading every row — an order that was never seen soon after creation, or seen but not delivered soon after.
  - **success:** Two rules keyed on a single named constant `SHAVINGS_SLA_THRESHOLD_HOURS = 3` flag delayed orders — (A) `Pending` and `now − PrequestDatetime > threshold`; (B) `Seen` set, `Delivered` null, `now − Seen > threshold`; a flagged order is both highlighted in-row and pinned into a dedicated "needs attention" (דורש טיפול) section; the threshold appears exactly once as the constant, never as a literal.

- **CAP-5 — Secretary add-order form with mandatory Ranch (#32)**
  - **intent:** The secretary creates a shavings order from the web, choosing a ranch explicitly and then the stalls under it.
  - **success:** A form mirroring the mobile admin add-order flow (price-catalog selection, delivery now/later, equal-or-per-stall bag quantity, multi-stall selection, notes) with a **required Ranch dropdown** that scopes the pickable stalls via `getStallBookingsForShavings(competitionId, ranchId)`; submitting posts to the existing `POST /api/ShavingsOrders` (which already authorizes `HostSecretary`) and the new order appears on refresh; submitting with no ranch selected is blocked with a Hebrew validation message.

- **CAP-6 — Loading / empty / error / degenerate states**
  - **intent:** The page behaves deliberately when data is loading, absent, failing, or reduces to a single booking ranch.
  - **success:** Distinct loading, empty ("no orders"), and error affordances (reusing the summary page's visual treatment); when only one booking ranch exists (today's live reality), ranch grouping collapses to a single group cleanly rather than showing an empty or broken toggle.

## Constraints

- **Consume Spec 1's vocabulary and reads; author no new stored procedures.** Status tokens are exactly `{Pending, Seen, Delivered}` (terminal `Delivered`); "unverified" = `arrivaltime IS NOT NULL AND deliveryphotourl IS NULL` (derived). If a field or read is missing, flag it as a Spec 1 dependency in `spec-1-dependencies.md` (`DEP-N`) — never inline SQL. Web reaches the API only through the shared `axiosInstance` → ASP.NET controller → BL → DAL → proc chain.
- **The SLA-bearing per-order read is `usp_getshavingsordersforcompetitionandranch` (#176), and it is scoped to one booking ranch.** Ranch enumeration and group-header rollups come from `usp_getcompetitionsummaryshavingsdetails` (#172); the page loops the order read per booking ranch. The loop must be built generically for N ranches even though live data currently has exactly one booking ranch per competition (booking ranch == host ranch, Double K). See `read-model.md`.
- **Approval is gone.** No `ApprovedByPersonId`/`ApprovedAt`, no approve button, no approval queue, no `WaitingApproval`/`Closed`. The web approval service functions are removed by Spec 1; Spec 2 must not reintroduce them.
- **`DeliveryPhotoUrl` must reach the page for CAP-3's unverified marker.** #176's exposed fields omit it; `spec-1-dependencies.md` DEP-1 records the required Spec 1 addition. If DEP-1 is not delivered, the unverified marker cannot render.
- **RTL Hebrew, Tailwind CSS v4, React Router v7.** Reuse the competition-summary visual language (`SummaryTable`, `SummaryAmountCards`, `CompetitionSummarySection` palette and card shapes) so the page reads as native. No default/template look — the grouping toggle and SLA flags must feel systemic.
- **Verify in the browser preview** (web dev server, `npm run dev`, `localhost:5173`) and attach screenshots of the ranch view, the status view, and a flagged-delayed order as proof; the redesign is observable.

## Non-goals

- **The data layer, stored procedures, worker-mobile app, and approval removal** — all Spec 1 (`spec-shavings-order-backend`). Spec 2 designs UI and consumes fields.
- **Notification push (#31/#46)** — no transport exists; entirely out of scope.
- **Authoring any new stored procedure** — new reads/fields are Spec 1 dependencies, not Spec 2 SQL.
- **Reworking the billing/charge split** inside `usp_createshavingsorder` — reused as-is.
- **Deep order-detail drill-down** (per-stall horses/payers richness, `R3`) beyond a basic row expand — optional for v1.

## Success signal

Mid-competition, the secretary opens the shavings page, sees every order grouped by status, and immediately spots the two orders pinned in "needs attention" — one unclaimed for over three hours since it was created, one seen over three hours ago but still not delivered. She flips the toggle to ranch grouping, confirms the counts per ranch, then adds a new order scoped to a specific ranch's stalls — with no approval step anywhere in the loop, and the new order shows up in the list.

## Assumptions

- Spec 1 lands first: the CAP-7 fields (`Seen`, `Delivered`, `PrequestDatetime`) on `usp_getshavingsordersforcompetitionandranch` (#176) and the token migration are deployed before Spec 2 ships. Spec 2's row rendering and SLA logic depend on those fields being present and populated.
- `hostRanchId` for the reads = `activeRole.ranchId`, identical to the competition-summary page (`CompetitionWorkspaceLayout` provides `competitionId`; `ActiveRoleContext` provides `ranchId`). Booking ranch equals host ranch on current data.

## Open Questions

- **#30 wording (confirm with Oren):** the original issue said "approved within 3h"; approval is removed, so the clock is **seen**, not approved. This spec proceeds with the seen-based clock and a "not seen / not delivered in time" label — confirm the Hebrew wording.
- **DEP-1 ownership:** should exposing `DeliveryPhotoUrl` on #176 be folded into Spec 1, or taken as a small Spec-2 backend touch? (Required either way for CAP-3.)
- **#32 price-catalog source for web:** mobile derives the shavings `priceCatalogId` from `getCompetitionInvitationDetails`; confirm the web read (reuse an invitation-details service if one exists, or a dedicated shavings-price read).
- **#32 ranch dropdown option set:** ranches the secretary is authorized for (HostSecretary in that ranch, matching the create-endpoint auth) and that have pickable stalls — on live data this is only the host ranch. Confirm host-only vs any booking ranch.
- **Unverified action:** Spec 2 surfaces the unverified flag on the row; whether the secretary gets any "request proof" affordance is TBD and depends on the out-of-scope notification track — flag only, no action, in v1.
