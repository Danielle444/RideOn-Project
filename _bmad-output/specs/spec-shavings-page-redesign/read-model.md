# Read Model & Grouping — Ranch ⇄ Status

Grounds CAP-1/CAP-2/CAP-6. How the page assembles "all orders for the competition" from Spec 1's
reads, and how the same list re-groups by ranch or by status. **No new proc; no inline SQL.**

## Live grounding (why the model is shaped this way)

Verified against live (`sxplumrexbolpwqacpiz`, 2026-07-24): **every** shavings order and **all 23**
stall bookings across competitions 7/8/44 have `stallbooking.ranchid == competition.hostranchid`
(only Double K / 11). So on current data there is exactly **one booking ranch = the host ranch**,
and group-by-ranch is degenerate (one group). But the summary procs (#172/#173) model booking
ranch as a first-class dimension distinct from host ranch, and #29 explicitly wants a ranch toggle
— so the model is built generically for **N booking ranches** while collapsing cleanly to one.

## The reads

| Ref | Call (web service fn) | Proc | Scope | Gives |
|---|---|---|---|---|
| **R1** | `getCompetitionSummaryShavingsDetails(competitionId, hostRanchId)` | #172 | host-ranch, **all booking ranches** | `{BookingRanchId, BookingRanchName, OrderCount, StallCount, BagQuantity, Expected/Paid/Unpaid}` per booking ranch → **ranch enumeration + group-header stats** |
| **R2** | `getShavingsOrdersForCompetitionAndRanch(competitionId, bookingRanchId)` | #176 | **one booking ranch** | per-order rows: `{ShavingsOrderId, RequestedDeliveryTime, BagQuantity, DeliveryStatus, Notes, WorkerSystemUserId, OrderedByName, ItemPrice, TotalAmount, Seen, Delivered, PrequestDatetime}` (+ `DeliveryPhotoUrl` — see DEP-1) |
| **R3** _(optional, row expand)_ | `getCompetitionSummaryShavingsEntries(competitionId, hostRanchId, bookingRanchId)` | #173 | one booking ranch | `HorseNames`, `PayerNames`, `IsPaid`, per-order amounts, `StallCount`, `BagQuantity` |

`hostRanchId = activeRole.ranchId`. R2 is **the SLA-bearing read** (it carries `Seen`/`Delivered`/
`PrequestDatetime` per Spec 1 CAP-7); R1 does **not** carry per-order timestamps, only rollups.

## Assembly (the master list)

```
rollup      = await R1(competitionId, hostRanchId)              // [{BookingRanchId, BookingRanchName, ...}]
perRanch    = await Promise.all(rollup.map(r =>
                 R2(competitionId, r.BookingRanchId)            // per booking ranch
                   .then(rows => rows.map(o => ({ ...o,
                        bookingRanchId:   r.BookingRanchId,
                        bookingRanchName: r.BookingRanchName }))))) 
orders      = perRanch.flat()                                   // the flat master list, ranch-tagged
```

- On live data `rollup` has one entry → one R2 call. The loop is `Promise.all`, not a waterfall.
- Each order row is tagged with its booking ranch so **both** grouping modes work off the one list
  with no refetch.
- Casing: read every field through the shared `getValue(item, camelKey, PascalKey, fallback)` helper
  (the API returns PascalId columns; the app tolerates both).

## Grouping (`shavingsGrouping.utils.js`, pure functions)

- **`group = "ranch"`** — group `orders` by `bookingRanchId`; each group's header stats come from the
  matching **R1 rollup** row (OrderCount / StallCount / BagQuantity / amounts). Natural grouping.
- **`group = "status"`** — bucket `orders` by `DeliveryStatus` into a fixed ordered set
  `["Pending", "Seen", "Delivered"]` (pipeline order); each group's header shows a count and bag sum
  derived client-side. Unknown/legacy tokens (should not occur post-migration) fall into a trailing
  "אחר" bucket rather than being dropped.

Grouping is a pure transform of the same `orders` array — switching modes never refetches.

## URL state (CAP-2)

React Router v7 `useSearchParams`:

- `?group=ranch|status` — default `ranch`. `setGroup` replaces the param (no history spam:
  `setSearchParams(next, { replace: true })`).
- `?ranch=<bookingRanchId>` — optional filter to one ranch group.
- `?status=Pending|Seen|Delivered` — optional filter to one status bucket.

Filters narrow the derived groups client-side; they do not change the fetch. `useSearchParams` is
only thinly used in the web app today (3 auth/superuser pages) — this establishes the pattern for
secretary workspace pages.

## Not this

- **Not** a per-ranch waterfall or an N+1 that blocks render — `Promise.all`, and N=1 in practice.
- **Not** proc #173 as the backbone — it lacks the SLA timestamps #30 needs. #176 is the backbone;
  #173 is optional row-expand richness only.
- **Not** a new competition-wide order-list proc — flagged as the deferred DEP-2, not built here.
