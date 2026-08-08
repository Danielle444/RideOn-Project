# Implementation Prompt — Competition Summary Breakdown Refactor (Secretary Web)

You are implementing a **frontend-only** refactor of the RideOn secretary web app's Competition Summary breakdown modal. Run this cold: you have no access to the conversation that produced it. The full contract is `SPEC.md` and its companion `view-layouts.md` in this same folder — **read both before editing.** This prompt is the goal + the rules; the SPEC/companion are the exact column matrices and drill-level model.

## What you are building

Refactor how the Competition Summary breakdown drill-downs render, with **no new data and no backend**. Every level-1 row is already fetched with the fields you need; the new "group by day" layer is a pure client-side `reduce()`.

1. **Paid-time → day-first (3 levels).** Level 1 = one row per `slotDate` with **one dynamic count column per distinct `productName`** (see "Resolved decisions" below), total requests, and combined paid/unpaid/total-expected. Level 2 = that day's existing per-slot rows. Level 3 = the existing `EntriesTable` (unchanged). **No hour or time-of-day tier.** Never derive product columns from `durationMinutes`.
2. **Classes → day-first (3 levels).** Level 1 = one row per `classDate` with the day's rollup (# classes, entries, fines, paid/unpaid/expected). Level 2 = that day's classes (existing columns). Level 3 = existing `EntriesTable` (unchanged).
3. **Stalls → delete two columns only.** Remove `סוסים` (`horseCount`) and `ציוד` (`tackCount`). Keep every other column and the row→entries drill. Structure otherwise unchanged.
4. **Shavings → untouched.** Do not restructure.
5. **Shared summary strip.** One reusable element showing **requests · paid · unpaid · overall total**, rendered identically on **every level** — the top day-list, the drilled-in day, the stalls/shavings tables, **and atop the innermost `EntriesTable`**. It does not exist today. Build it once and reuse it.

## Files (verified against live code — confirm before editing)

- `RideOnClient/rideon-client/web/src/components/secretary/competition-summary/SummaryDetailsModal.jsx` — `DetailsTable` = level-1 category table; `EntriesTable` = innermost per-record list; `SummaryTable` = the shared table primitive.
- `RideOnClient/rideon-client/web/src/hooks/secretary/useCompetitionSummaryPage.js` — `openDetails()` fetches flat level-1 rows into `detailsItems`; `openEntriesForDetail()` fetches the innermost entries by a row's id. The drill is **2-level today**; classes + paid-time must become 3-level while stalls + shavings stay 2-level.
- `RideOnClient/rideon-client/web/src/services/competitionSummaryService.js` — **read-only reference.** Do not add endpoints or params here.

Confirmed row fields you will aggregate (read via the existing `getValue` helper, camelCase key with Pascal fallback): paid-time rows carry `slotDate`, `startTime`, `endTime`, `arenaName`, `productId`, `productName`, `durationMinutes`, `requestCount`, `paidTimeSlotInCompId`, `paidAmount`, `unpaidAmount`, `expectedAmount`; class rows carry `classDate`, `orderInDay`, `className`, `entryCount`, `fineCount`, `classInCompId`, and money. The stalls entries drill keys on `bookingRanchId`+`productId`+`isForTack` — **independent of the deleted columns**, so deleting them cannot break it. See `view-layouts.md` for the full per-view column matrices.

## Resolved decisions (both settled by Oren — build to these)

- **Summary strip breadth:** the shared strip renders on **every level, including atop the innermost `EntriesTable`.** At the entries level, `EntriesTable` rows carry money as `amount` (classes/paid-time) or `expectedAmount` (stalls/shavings) plus an `isPaid` flag, not split paid/unpaid columns — bucket each entry's amount by `isPaid` to get paid vs unpaid, and use the row count as the requests/entries figure. Keep the strip's visual shape identical across levels even though source fields differ per level (see `view-layouts.md`).
- **Paid-time product columns:** render **one dynamic count column per distinct `productName`** present across the paid-time rows — the header is the product name itself, the cell is that day's count of slots for that product. Derive the column set once from the full row set so every day row shares the same columns (zero where a product didn't run that day). No hard-coded "short/long", and **never** a `durationMinutes` threshold.

## Boundaries

- **Frontend-only.** No `.cs`, no stored procedures, no DAL/controller, no new endpoints or query params. All grouping/aggregation is client-side over already-fetched rows. If something seems to require backend, **stop and raise it** rather than implementing it.
- **Do not change the innermost `EntriesTable` column sets** for any category.
- **Do not** add a day layer to stalls, shavings, or cash.
- Reuse the existing visual language (`SummaryTable`, the modal's palette/card shapes, RTL Hebrew, Tailwind CSS v4). No new dependency, no template look.

## Definition of done

- Classes and paid-time open day-first (Day → rows → entries); paid-time day rows show short/long counts by product with combined totals and no navigation deeper than a slot.
- Stalls no longer render `סוסים`/`ציוד`; shavings is visibly unchanged.
- One shared summary strip renders identically across the day-list, a drilled-in day, and the stalls/shavings tables.
- Verified in the browser preview (`npm run dev`, `localhost:5173`) with screenshots attached to the PR: paid-time day-list + drilled day, classes day-list + drilled day, stalls (columns removed), and the shared strip on ≥2 categories.
- `npm run lint` and `npm run build` pass in `RideOnClient/rideon-client/web`.

## Colleague execution rules

- New feature branch off **current** `main` — `git fetch origin && git checkout -b feature/summary-breakdown-refactor origin/main` (main has progressed since this spec was written, so branch off the latest); never commit to `main`, never merge/integrate without explicit approval.
- Push everything to the public remote (`git push -u origin <branch>`) and open a PR against `main` — nothing left only local.
- Investigate the current file + the endpoint it consumes before editing; mark verified vs inferred; flag path/spec corrections rather than silently fixing.
- Frontend-only — no `.cs`, no procs. Run `npm run lint` and `npm run build` in `RideOnClient/rideon-client/web` before opening the PR (no `dotnet build` — no server change).
