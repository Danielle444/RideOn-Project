# view-layouts.md — per-view column matrices & drill-level model

Companion to `SPEC.md`. Holds the load-bearing table detail the kernel cites but does not inline. All field names below were read from live code (`SummaryDetailsModal.jsx`, `useCompetitionSummaryPage.js`) and are the camelCase key; each is read through the existing `getValue(item, camelKey, PascalKey, fallback)` helper, so the Pascal fallback keeps working.

## Drill-level model (the core structural change)

Today the hook is **2-level** for every category:

```
detailsItems (openDetails)  →  entryItems (openEntriesForDetail)
```

After this refactor:

| Category   | Levels | Level 1 (new)        | Level 2               | Level 3            |
|------------|--------|----------------------|-----------------------|--------------------|
| paid-time  | **3**  | day (per `slotDate`) | the day's slot rows*  | `EntriesTable`     |
| classes    | **3**  | day (per `classDate`)| the day's class rows* | `EntriesTable`     |
| stalls     | 2      | stall rows (cols trimmed) | —                | `EntriesTable`     |
| shavings   | 2      | shavings rows (unchanged) | —                | `EntriesTable`     |
| cash       | 1      | cash rows (unchanged, no drill) | —          | —                  |

\* "the day's rows" are exactly the current level-1 rows for that category, filtered to the selected day — same columns as today.

The day layer is a client-side `reduce()` over `detailsItems`; it introduces one new selected-day navigation state between the day-list and the entries view. Stalls/shavings must **not** gain a day layer. Implementers may either extend the existing hook state with a `selectedDay` (kept null for 2-level categories) or group inside the modal component — either is fine as long as no refetch is added and stalls/shavings stay 2-level.

## Paid-time — Level 1 (NEW: day rows)

One row per distinct `slotDate`, aggregated from that day's slot rows:

| Column        | Source                                                            |
|---------------|------------------------------------------------------------------|
| יום (day)      | `slotDate` (the group key)                                        |
| _(one column per distinct `productName`)_ | count of the day's slots whose `productName` matches that column header |
| בקשות (requests) | sum of `requestCount` across the day's slots                    |
| שולם          | sum of `paidAmount`                                               |
| לא שולם        | sum of `unpaidAmount`                                             |
| סה״כ צפוי      | sum of `expectedAmount`                                           |

> **OQ-2 RESOLVED (Oren).** The product count columns are **dynamic: one column per distinct `productName`** present across the paid-time rows, each header being the product name itself and each cell the count of that day's slots for that product. No hard-coded "short/long" pair, and **never** a `durationMinutes` threshold. Derive the column set once from the full row set (so every day row has the same columns, zero where a product didn't run that day).

## Paid-time — Level 2 (existing slot rows, unchanged columns)

Rendered for the selected day only. Same columns as today's paid-time `DetailsTable`:
`יום · שעה · מגרש · מוצר · אורך · בקשות · שולם · לא שולם · סה״כ צפוי`
(fields: `slotDate`, `startTime`–`endTime`, `arenaName`, `productName`, `durationMinutes`, `requestCount`, `paidAmount`, `unpaidAmount`, `expectedAmount`). Row click → level 3 entries via `paidTimeSlotInCompId` + `productId` (unchanged path).

## Paid-time — Level 3 (`EntriesTable`, unchanged)

`רוכב · סוס · מאמן · משלם · סטטוס בקשה · תשלום · סכום`. Do not touch.

## Classes — Level 1 (NEW: day rows)

One row per distinct `classDate`, aggregated from that day's class rows:

| Column        | Source                                    |
|---------------|-------------------------------------------|
| יום (day)      | `classDate` (the group key)               |
| מקצים (# classes) | count of the day's class rows          |
| כניסות (entries) | sum of `entryCount`                     |
| קנסות (fines)  | sum of `fineCount`                        |
| שולם          | sum of `paidAmount`                        |
| לא שולם        | sum of `unpaidAmount`                      |
| סה״כ צפוי      | sum of `expectedAmount`                    |

## Classes — Level 2 (existing class rows, unchanged columns)

Rendered for the selected day only. Same columns as today's classes `DetailsTable`:
`יום · מס׳ · שם מקצה · כניסות · קנסות · שולם · לא שולם · סה״כ צפוי`
(fields: `classDate`, `orderInDay`, `className`, `entryCount`, `fineCount`, money). Row click → level 3 entries via `classInCompId` + `sectionKey` (unchanged path).

## Classes — Level 3 (`EntriesTable`, unchanged)

`סדר · רוכב · סוס · מאמן · משלם · מקבל פרס · קנס · סטטוס · סכום`. Do not touch.

## Stalls — Level 1 (columns trimmed only)

Delete `סוסים` (`horseCount`) and `ציוד` (`tackCount`). Keep the rest and the drill:

| Column      | Source            | Change |
|-------------|-------------------|--------|
| חווה         | `bookingRanchName`| keep   |
| סוג תא       | `productName`     | keep   |
| סוג שימוש    | `isForTack` → תא ציוד / תא סוס | keep |
| הזמנות       | `bookingCount`    | keep   |
| ~~סוסים~~    | ~~`horseCount`~~  | **DELETE** |
| ~~ציוד~~     | ~~`tackCount`~~   | **DELETE** |
| שולם         | `paidAmount`      | keep   |
| לא שולם       | `unpaidAmount`    | keep   |
| סה״כ צפוי     | `expectedAmount`  | keep   |

Row click → entries via `bookingRanchId` + `productId` + `isForTack` — **verified independent of the two deleted columns**, so the drill is unaffected. `EntriesTable` for stalls stays unchanged.

## Shavings — untouched

Both the level-1 `DetailsTable` and the `EntriesTable` for shavings are unchanged. Do not restructure.

## Shared summary strip (CAP-4)

One reusable element (e.g. `SummaryStrip`), rendered from whatever rows are currently in view. Fields:

| Cell            | Value                                   |
|-----------------|-----------------------------------------|
| בקשות / הזמנות   | sum of the row-set's count field (`requestCount` for paid-time; row count or order count elsewhere — pick the count each category already exposes) |
| שולם            | sum of `paidAmount` / `expectedAmount`-paid |
| לא שולם          | sum of `unpaidAmount`                    |
| סה״כ            | sum of `expectedAmount`                   |

**OQ-1 RESOLVED (Oren): it renders on EVERY level** — the top day-list, the drilled-in day, the stalls & shavings tables, **and atop the innermost `EntriesTable`**. Build it once and pass it the rows currently in view; do not re-implement per category or per level. Match the modal's existing card/palette treatment so it reads native.

Note on the entries level: `EntriesTable` rows expose their money as `amount` (classes/paid-time) or `expectedAmount` (stalls/shavings) and a paid/unpaid state via `isPaid` rather than split `paidAmount`/`unpaidAmount` columns. When rendering the strip atop `EntriesTable`, derive paid vs unpaid by bucketing each entry's amount on its `isPaid` flag, and use the row count as the "requests/entries" figure. Keep the strip's visual shape identical across levels even though the per-level source fields differ.
