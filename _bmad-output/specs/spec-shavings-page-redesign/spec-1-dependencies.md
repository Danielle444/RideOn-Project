# Spec 1 Dependencies — Fields & Reads This Page Consumes

The explicit contract Spec 2 draws from Spec 1 (`spec-shavings-order-backend`). Everything here is
**owned by Spec 1**; Spec 2 authors no procs. `DEP-N` entries are things Spec 2 needs that Spec 1's
current contract does **not** yet guarantee — they are requests to Spec 1, not Spec 2 work.

## Vocabulary consumed (must match Spec 1 exactly)

- `deliverystatus ∈ {Pending, Seen, Delivered}` — terminal `Delivered`, no `Closed`/`WaitingApproval`.
- **Unverified delivery** = `arrivaltime IS NOT NULL AND deliveryphotourl IS NULL` (derived; no column).
- **No approval** — `ApprovedByPersonId`/`ApprovedAt`, approve action, and approval queue do not exist.

## Reads reused as-is (no change needed)

| Ref | Proc (post-hygiene #) | Used for |
|---|---|---|
| R1 | `usp_getcompetitionsummaryshavingsdetails` (#172) | ranch enumeration + group-header rollups (#29) |
| R2 | `usp_getshavingsordersforcompetitionandranch` (#176) | per-order backbone incl. SLA fields (#29/#30) |
| R3 | `usp_getcompetitionsummaryshavingsentries` (#173) | optional row-expand richness (horses/payers/paid) |
| — | `usp_createshavingsorder` (#169) | add-order write (#32) |
| — | `usp_getstallbookingsforshavings` (#177) | add-order stall picker (#32) |

## Fields consumed from R2 (#176), per Spec 1 CAP-7 / spec-2-handoff.md

| Field | Meaning | Consumed by |
|---|---|---|
| `DeliveryStatus` | `Pending`/`Seen`/`Delivered` | CAP-2 status grouping, CAP-3 chip |
| `Seen` (= `responsetime`) | when a worker took the order | CAP-4 Rule B clock |
| `Delivered` (= `arrivaltime`) | canonical delivered-at | CAP-3 timestamp, CAP-4 stop condition |
| `PrequestDatetime` (= `productrequest.prequestdatetime`) | creation clock, populated on all rows | CAP-4 Rule A clock |
| `WorkerSystemUserId` | who claimed it | attribution |
| `ItemPrice` / `TotalAmount` | pricing | financial column |
| `RequestedDeliveryTime`, `BagQuantity`, `Notes`, `OrderedByName` | existing columns | row display |

## DEP-1 — REQUIRED: expose `DeliveryPhotoUrl` on R2 (#176)

- **Need:** CAP-3's "unverified delivery" marker = `Delivered` set **and no photo**. Computing it needs
  `deliveryphotourl` on the order row. Spec 1's handoff names "unverified" as a first-class Spec-2
  concept but #176's exposed field list **omits the photo URL** — a gap in the current contract.
- **Ask:** append `DeliveryPhotoUrl` (nullable) **last** to `usp_getshavingsordersforcompetitionandranch`
  (#176) and its DTO. Return-type change → `DROP FUNCTION` + `CREATE`, the same discipline CAP-7 already
  applies to this proc. Alternatively expose a derived `IsUnverified` boolean; `DeliveryPhotoUrl` is
  preferred (also lets the secretary open the proof if present).
- **If not delivered:** CAP-3's unverified marker cannot render; the rest of the page still works.
- **Open:** ownership — fold into Spec 1, or take as a small Spec-2 backend touch on the same proc/DTO.

## DEP-2 — OPTIONAL / deferred: competition-scoped order-list read

- **Need:** R2 (#176) is scoped to one booking ranch, so the page loops it per ranch. A single read
  returning **all** booking ranches' orders in one call — with `BookingRanchId`/`BookingRanchName` in
  the output — would remove the client-side loop.
- **Why deferred:** live data has exactly one booking ranch per competition (booking ranch == host
  ranch), so the loop is a single call today. Not needed for v1.
- **Ask (when multi-ranch becomes real):** a variant of #176 without the `sb.ranchid = p_ranchid`
  filter (or an `all-ranches` mode) that adds `BookingRanchId`/`BookingRanchName` columns.

## Coordination

- The web approval action (`CompetitionShavingsPage.jsx` → `approveDelivery`; the service's
  `getPendingDeliveryApprovals`/`approveDelivery`) is removed **by Spec 1** as part of killing approval.
  Spec 2 rebuilds the rest of that page. Confirm no live session is mid-edit on that file before either
  spec touches it.
- Both specs (and the out-of-scope #31/#46 notification track) touch the worker mobile app / shared
  surfaces — coordinate merges to `main`. Spec 2 must ship **after** Spec 1's #176 fields are deployed.
