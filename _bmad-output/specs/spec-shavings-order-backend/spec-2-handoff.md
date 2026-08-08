# Hand-off to Spec 2 (Secretary Shavings Page Redesign)

What Spec 1 establishes and exposes, so Spec 2 (#29 ranch/status grouping, #30 SLA
highlighting, #32 add-order form) is built on a settled vocabulary. Spec 2 designs the UI;
Spec 1 does not.

## Vocabulary Spec 2 must adopt

- **Status view is derived, not a raw token.** Stored `deliverystatus ∈ {Pending, Delivered}` only (terminal is `Delivered`, not `Closed`; no `WaitingApproval`). The three-state view Spec 2 groups by is **derived**: `Delivered` if `Delivered`(=`arrivaltime`) set, else `Seen` if `WorkerSystemUserId` set, else `Pending`. **Do not group on the raw `DeliveryStatus` alone** — a claimed-undelivered order is stored as `Pending` but must display as `Seen`.
- **"Unverified delivery"** = `arrivaltime IS NOT NULL AND deliveryphotourl IS NULL` (derived; no column). This is the flag the secretary uses to decide whether to ask for proof — the primary consumer of the no-photo path.
- **Approval is gone.** Do not surface `ApprovedByPersonId`/`ApprovedAt`, an approve button, or an approval queue. The old `pending-approvals` page/endpoint no longer exists.

## Fields Spec 2 reads

From `usp_getshavingsordersforcompetitionandranch` (proc #176 after hygiene; DTO
`CompetitionShavingsOrderListItem`), now returning:

| Field | Meaning | Use in Spec 2 |
|---|---|---|
| `DeliveryStatus` | `Pending`/`Seen`/`Delivered` | #29 status grouping |
| `Seen` (= `responsetime`) | when the worker took the order | #30 SLA (seen-but-undelivered clock) |
| `Delivered` (= `arrivaltime`) | canonical delivered-at | #29 status; delivery timestamp column |
| `PrequestDatetime` (= `productrequest.prequestdatetime`) | order creation clock, populated on all rows | **#30 SLA source** (unclaimed age) |
| `WorkerSystemUserId` | who claimed it | attribution |
| `ItemPrice` / `TotalAmount` | pricing | financial column |

## SLA rules (#30) the fields support

- **Unclaimed too long:** `WorkerSystemUserId IS NULL` (⇒ derived `Pending`) and `now() - PrequestDatetime > 3h`.
- **Seen but not delivered too long:** `WorkerSystemUserId` set, `Delivered`(=`arrivaltime`) NULL, and `now() - Seen > 3h`. (Legacy claimed rows have `Seen` NULL — fall back to `PrequestDatetime` for the clock, or exclude; Spec 2's call.)
- (Thresholds are Spec 2's to finalize/surface; Spec 1 only guarantees the fields exist and are populated.)

## Reads Spec 2 should REUSE (do not reinvent)

- **#29 summary rollup** — `usp_getcompetitionsummaryshavingsdetails` (proc #172): groups by booking ranch, rolls up OrderCount/StallCount/BagQuantity + Expected/Paid/Unpaid.
- **#29 per-order rows** — `usp_getcompetitionsummaryshavingsentries` (proc #173): per-order rows for a booking ranch with DeliveryStatus/HorseNames/PayerNames/IsPaid + amounts (note the Hebrew `'תא ציוד'` tack-stall fallback).
- **#32 add-order form** — `usp_createshavingsorder` (#169, already takes `p_ranchid` + `p_stalls` jsonb) + `usp_getstallbookingsforshavings` (#177, pickable stalls). The controller path (`POST /ShavingsOrders`, `GET /ShavingsOrders/stall-bookings-for-order`) already exists; Spec 2 confirms the required-ranch UX.

## Coordination note

- The **web approval action** (`CompetitionShavingsPage.jsx` calls `approveDelivery`; `web/src/services/shavingsOrderService.js` exports `getPendingDeliveryApprovals`/`approveDelivery`) is removed by Spec 1 as part of killing approval. The rest of that page is Spec 2's to redesign. Confirm no live session is mid-edit on that file before either spec touches it.
- Both specs and the (out-of-scope) #31/#46 notification track all touch the worker mobile app — coordinate merges to `main`.
