# Read Model & Grouping — Participating Ranch ⇄ Status

Grounds CAP-1/CAP-2/CAP-6. How the page assembles "all orders for the competition" from Spec 1's
shipped reads, and how the same list re-groups by ranch or by **derived** status. **No new proc; no
inline SQL.**

## Derived status (critical — status is not a stored token)

Spec 1 stores `deliverystatus ∈ {Pending, Delivered}` only. A claimed-but-undelivered order is stored
`Pending` yet must display `Seen`. Compute the display/group state, never read the stored token for
grouping or labels:

```js
// shavingsStatus.utils.js
export function deriveShavingsStatus(order) {
  if (getDelivered(order))          return "Delivered"; // Delivered (=arrivaltime) set
  if (getWorkerSystemUserId(order)) return "Seen";      // claimed, not yet delivered
  return "Pending";                                     // created, unclaimed
}
```

`getDelivered` / `getSeen` / `getWorkerSystemUserId` / `getCreated` read the R2 fields through the
casing-tolerant `getValue(item, camelKey, PascalKey, fallback)` helper.

## Live grounding (why the ranch model is shaped this way)

Verified live (`sxplumrexbolpwqacpiz`, 2026-07-26): across **all** stall bookings,
`stallbooking.ranchid == horse.ranchid == competition.hostranchid` — every horse is a Double K horse
at the Double K venue, so the three notions are indistinguishable in current data. Per Oren, the
grouping ranch is the **participating ranch the horse belongs to**; the field the summary procs group
on (`stallbooking.ranchid`, surfaced as **BookingRanch**) tracks the horse's ranch and is deliberately
modeled as a dimension separate from `hostranchid`. So the page groups by BookingRanch = participating
ranch — one group today, built to render N.

## The reads (all deployed)

| Ref | Call (web service fn) | Proc | Scope | Gives |
|---|---|---|---|---|
| **R1** | `getCompetitionSummaryShavingsDetails(competitionId, hostRanchId)` | #172 | host-scoped, **all participating ranches** | per-ranch `{BookingRanchId, BookingRanchName, OrderCount, StallCount, BagQuantity, Expected/Paid/Unpaid}` → **ranch enumeration + group-header stats** |
| **R2** | `getShavingsOrdersForCompetitionAndRanch(competitionId, participatingRanchId)` | #176 | **one participating ranch** | per-order rows: `{ShavingsOrderId, RequestedDeliveryTime, BagQuantity, DeliveryStatus, Notes, WorkerSystemUserId, OrderedByName, PriceCatalogId, ItemPrice, TotalAmount, Seen, Delivered, PrequestDatetime}` |
| **R3** _(optional, row expand)_ | `getCompetitionSummaryShavingsEntries(competitionId, hostRanchId, bookingRanchId)` | #173 | one participating ranch | `HorseNames` (Hebrew `'תא ציוד'` tack fallback), `PayerNames`, `IsPaid`, per-order amounts, `StallCount`, `BagQuantity` |

`hostRanchId = activeRole.ranchId`. **R2 is the SLA-bearing read** (carries `Seen`/`Delivered`/
`PrequestDatetime`); R1 carries only rollups. R2 does **not** carry `DeliveryPhotoUrl` — see DEP-1.

## Assembly (the master list)

```
rollup   = await R1(competitionId, hostRanchId)                 // participating ranches + rollups
perRanch = await Promise.all(rollup.map(r =>
              R2(competitionId, r.BookingRanchId)
                .then(rows => rows.map(o => ({ ...o,
                     participatingRanchId:   r.BookingRanchId,
                     participatingRanchName: r.BookingRanchName,
                     derivedStatus:          deriveShavingsStatus(o) })))))
orders   = perRanch.flat()                                      // flat master list, ranch-tagged + status-derived
```

- On live data `rollup` has one entry → one R2 call. `Promise.all`, not a waterfall.
- Each row is tagged with its participating ranch and its derived status so **both** grouping modes
  work off the one list with no refetch.

## Grouping (`shavingsGrouping.utils.js`, pure functions)

- **`group = "ranch"`** — group `orders` by `participatingRanchId`; each group's header stats come from
  the matching **R1 rollup** row. Natural grouping.
- **`group = "status"`** — bucket `orders` by `derivedStatus` into fixed pipeline order
  `["Pending", "Seen", "Delivered"]`; header count + bag sum derived client-side. (No `WaitingApproval`/
  `Closed`; any unexpected value falls into a trailing "אחר" bucket rather than being dropped.)

Grouping is a pure transform of the same `orders` array — switching modes never refetches.

## URL state (CAP-2)

React Router v7 `useSearchParams`:

- `?group=ranch|status` — default `ranch`; `setSearchParams(next, { replace: true })` (no history spam).
- `?ranch=<participatingRanchId>` and `?status=Pending|Seen|Delivered` — optional filters that narrow the
  derived groups client-side; they do not change the fetch.

`useSearchParams` is thinly used in the web app today (3 auth/superuser pages) — this establishes the
pattern for secretary workspace pages.

## Not this

- **Not** grouping/labelling on the stored `DeliveryStatus` token — always the derived status.
- **Not** proc #173 as the backbone — it lacks the SLA timestamps. #176 is the backbone; #173 is
  optional row-expand richness only.
- **Not** a per-ranch waterfall or N+1 — `Promise.all`, N=1 in practice.
- **Not** a new competition-wide order-list proc — flagged as the deferred DEP-2, not built here.
