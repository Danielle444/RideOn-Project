---
id: SPEC-summary-breakdown-refactor
companions:
  - view-layouts.md
  - implementation-prompt.md
sources: []
---

> **Canonical contract.** This SPEC and the files in `companions:` are the complete, preservation-validated contract for what to build, test, and validate. It was distilled from a completed party-mode triage; every decision below is locked. `view-layouts.md` holds the per-view column matrices and the drill-level model; `implementation-prompt.md` is the self-contained goal prompt the implementing colleague runs cold.

# Competition Summary Breakdown Refactor (Secretary Web)

## Why

The secretary's Competition Summary breakdown modal (`SummaryDetailsModal.jsx`) opens each category as a flat wall of rows and drills too deep. She can't answer "how did this day go?" without reading a spreadsheet, and some columns restate data she already has elsewhere. This refactor makes the two heaviest categories **day-first** (group by day, then drill), trims redundant stall columns, and adds one **shared summary strip** that reads identically everywhere — a calmer, higher-altitude view. **No new data and no backend:** every level-1 row is already fetched with the fields needed, so the day layer is a pure client-side `reduce()`. Verified live: `DetailsTable` is the level-1 table and `EntriesTable` the innermost list in `SummaryDetailsModal.jsx`; `openDetails()`/`openEntriesForDetail()` in `useCompetitionSummaryPage.js` drive a 2-level drill today; `competitionSummaryService.js` is read-only reference. Branch off current `main`.

## Capabilities

- **CAP-1 — Paid-time day-first, short/long as columns (not a drill tier)**
  - **intent:** The secretary opens paid-time and first sees one row per **day**, each showing how many short and how many long pay-times ran that day, with the day's combined money — then drills into a single day to see its slots.
  - **success:** Level 1 renders one row per `slotDate` with **one dynamic count column per distinct `productName`** present in that day's rows (self-describing product columns, not hard-coded "short/long" and never derived from `durationMinutes`), plus total requests and combined paid / unpaid / total-expected (all products summed); clicking a day opens **level 2** = that day's existing per-slot rows (hour, arena, product, length, requests, paid/unpaid/total); clicking a slot opens **level 3** = the existing `EntriesTable`, unchanged; there is **no hour tier and no time-of-day tier** — day-then-slot is as deep as paid-time goes.

- **CAP-2 — Classes day-first**
  - **intent:** The secretary opens classes and first sees one row per **day** with the day's rolled-up totals, then drills into a day to see its classes.
  - **success:** Level 1 renders one row per `classDate` with the day's rollup (# classes, total entries, total fines, combined paid / unpaid / expected); clicking a day opens **level 2** = that day's classes with the existing class columns; clicking a class opens **level 3** = the existing `EntriesTable`, unchanged.

- **CAP-3 — Stalls: remove redundant columns, structure unchanged**
  - **intent:** The stalls table stops restating horse/equipment counts the secretary already has, without otherwise changing.
  - **success:** The `סוסים` (horseCount) and `ציוד` (tackCount) columns are deleted from the level-1 stalls table; every other column (חווה, סוג תא, סוג שימוש, הזמנות, שולם, לא שולם, סה״כ צפוי) and the existing row→entries drill remain exactly as they are; the entries drill still keys on `bookingRanchId`+`productId`+`isForTack` (confirmed independent of the deleted columns).

- **CAP-4 — One shared summary strip across every view**
  - **intent:** Wherever the secretary is in the modal, the same at-a-glance totals read the same way, so she never re-learns the layout per category.
  - **success:** A single shared element shows **requests · paid · unpaid · overall total** and renders identically on **every level** — the top day-list, the drilled-in day, the stalls and shavings tables, **and atop the innermost `EntriesTable`**; it is built once and reused (not re-implemented per category); its values are computed client-side from the rows currently in view; consistency across categories and levels is a hard requirement, not best-effort.

## Constraints

- **Frontend-only.** No `.cs`, no stored procedure, no DAL/controller change, no new endpoint or query parameter. If any capability appears to need backend, **stop and flag it** — do not implement it. All grouping and aggregation is client-side `reduce()` over rows already returned by the existing endpoints.
- **The day layer adds a drill level; it does not add a fetch.** The hook drives a **2-level** model today (`detailsItems` → `entryItems`). Classes and paid-time must become **3-level** (day-groups → the day's existing rows → entries) while **stalls and shavings stay 2-level**. Day grouping is a `reduce()` over already-fetched `detailsItems` (paid-time on `slotDate`, classes on `classDate`); each grouped row already carries the id the entries drill needs (`paidTimeSlotInCompId`+`productId`, `classInCompId`), so drilling from a day's rows to entries keeps working.
- **Do not change the innermost `EntriesTable` column sets** for any category.
- **Short vs long is a product classification, never a duration threshold.** `durationMinutes` is a display value; deriving the short/long split from it is banned. See OQ-2 for the unresolved classification source.
- **Shavings is untouched.** Its current presentation is good; do not restructure its tables or drill.
- **Reuse the existing visual language** (`SummaryTable`, the modal's palette and card shapes, RTL Hebrew, Tailwind CSS v4). The result must read as native to the page — no default/template look, no new dependency.
- **Verify in the browser preview** (web dev server, `npm run dev`, `localhost:5173`) and attach screenshots as proof: paid-time day-list + drilled day, classes day-list + drilled day, stalls table (columns removed), and the shared strip on at least two categories.

## Non-goals

- No hour / time-of-day navigation tier for paid-time (day → slot is the deepest navigation before entries).
- No restructuring of shavings — presentation and drill stay as-is.
- No backend or schema work of any kind: no procs, no DAL, no controllers, no new endpoints or params.
- No change to the innermost per-record `EntriesTable` columns.
- No change to the `cash` and `payments` breakdowns (out of the party's scope).

## Success signal

In the running web app (`npm run dev`, `localhost:5173`): classes and paid-time each open to a **day-first** view (Day → rows → entries); paid-time day rows show **one count column per distinct product** with combined totals and no navigation deeper than a slot; the stalls table no longer renders `סוסים`/`ציוד`; shavings is visibly unchanged; **one shared summary strip renders identically on every level**, including atop the innermost `EntriesTable`; and `npm run lint` and `npm run build` both pass in `RideOnClient/rideon-client/web`.

## Assumptions

- Day grouping needs no refetch: `slotDate` (paid-time) and `classDate` (classes) are present on every level-1 row already fetched by `openDetails()`.
- Collapsing rows under a day header preserves drill-to-entries because each row retains its `paidTimeSlotInCompId`+`productId` / `classInCompId` id.

## Resolved decisions (formerly open questions)

- **OQ-1 → RESOLVED (Oren, 2026-08-03):** The shared summary strip (CAP-4) renders on **every level, including atop the innermost `EntriesTable`** — see CAP-4 success.
- **OQ-2 → RESOLVED (Oren, 2026-08-03):** Paid-time level-1 renders **one dynamic count column per distinct `productName`** present in the day's rows — self-describing, no hard-coded short/long, and never a `durationMinutes` threshold. See CAP-1 success and `view-layouts.md`.

No open questions remain.
