# CAP-1 — Empty-state sites: the 3-state standard and the full site inventory

All paths are under `RideOnClient/rideon-client/web/src/`. Verified against repo
source 2026-07-29. Line anchors are as-read that day; re-confirm on open.

## The standard (copy this shape)

Canonical reference: `components/secretary/CompetitionsTable.jsx:256-263`.

```jsx
<tbody>
  {props.loading && <DataTableLoadingState colSpan={N} />}

  {!props.loading && rows.length === 0 && (
    <DataTableEmptyState colSpan={N} message="…optional specific string…" />
  )}

  {!props.loading &&
    rows.map(/* … */)}
</tbody>
```

Rules:
1. **Loading wins.** While the fetch is in flight, render only the loading state —
   never the empty message.
2. **Empty is gated on `!loading && isEmpty`.** The empty message appears only after
   the fetch resolves with no data.
3. **`colSpan` must equal the visible column count.** Where a table computes its
   column count (e.g. `SecretaryClassesOverviewTable` uses `columnCount`), reuse
   that — a hardcoded, drifted colSpan silently breaks the empty/loading rows.
4. Non-table, page-level surfaces use `LoadingSpinner` for the loading state and a
   plain centered message div for empty (there is no shared page-level empty
   component — that is acceptable, do not invent one).
5. A surface that has **no `loading` signal today** must get one threaded from its
   hook/page. If the parent hook already exposes `loading`, pass it down; if not,
   add it to the hook's return (it almost always already tracks a `loading`
   `useState` internally — check before adding).

## Shared primitives (already exist — do not rebuild)

| Primitive | File | Default message |
|---|---|---|
| `DataTableLoadingState` | `components/common/table/DataTableLoadingState.jsx` | `טוען נתונים...` |
| `DataTableEmptyState` | `components/common/table/DataTableEmptyState.jsx` | `לא נמצאו נתונים להצגה` |
| `LoadingSpinner` | `components/common/LoadingSpinner.jsx` | `LOADING` (page-level) |

## Tier legend

- **Tier A — bug (no loading gate):** renders the empty message purely on
  `data.length === 0`, with no loading awareness → flashes "missing" during load.
  **Priority.** Migrate to the full 3-state and thread `loading`.
- **Tier B — cosmetic (gated, hand-rolled):** already gates on `loading`, but
  hand-rolls the loading/empty markup instead of the shared primitives. No flash
  bug; swap to shared components for consistency. Lower priority.
- **Tier C — out of scope:** not a data-fetch empty (search-empty, per-field
  "not set", auth/error banner). Do NOT touch. Listed so the implementer does not
  over-migrate.

`(read)` = tier confirmed by reading the file. `(prior)` = tier inferred from a
`loading`-reference grep only; **implementer must open the file to confirm** before
editing (per the memlog assumption).

---

## Already correct — 3-state via shared primitives (no action; reference set)

These 15 already import and use `DataTableEmptyState` + `DataTableLoadingState`
the right way. Use them as models; do not change them.

- `components/secretary/CompetitionsTable.jsx` *(canonical reference)*
- `components/secretary/classes/SecretaryClassesOverviewTable.jsx`
- `components/secretary/classes/SecretaryClassEntriesTable.jsx`
- `components/secretary/arenas-stalls/ArenasTable.jsx`
- `components/secretary/arenas-stalls/StallCompoundsTable.jsx`
- `components/secretary/service-prices/ServicePricesTable.jsx`
- `components/secretary/service-prices/ServicePriceHistoryModal.jsx`
- `pages/secretary/CompetitionPaidTimePage.jsx` *(the `:349` slots table — its
  second empty at `:618` is a separate hand-rolled site, see Tier A/B below)*
- `components/superuser/FinesTable.jsx`
- `components/superuser/SuperUsersTable.jsx`
- `components/superuser/RequestsTable.jsx`
- `components/superuser/PrizeTypesTable.jsx`
- `components/superuser/JudgesTable.jsx`
- `components/superuser/FieldsTable.jsx`
- `components/superuser/ClassTypesTable.jsx`

---

## Migration targets — data-fetch lists/tables

### Tier A — no loading gate (flashes "missing"; priority)

| # | File : anchor | Current empty string | Notes |
|---|---|---|---|
| A1 | `components/secretary/shavings/ShavingsOrdersTable.jsx:48-53` | `אין נתונים להצגה` | **(read)** `if (orders.length===0) return <Empty>` — zero loading awareness. Component takes no `loading` prop; thread one from `useCompetitionShavingsPage`. Not a table `<tbody>` — a card div; may use `LoadingSpinner` or a table-shell refactor. |
| A2 | `components/secretary/competition-payments/PaymentChargesTable.jsx:398` | `אין שורות חיוב להצגה` | **(prior, 0 loading hits)** confirm no gate; thread `loading`. |
| A3 | `components/secretary/stall-map/StallBookingsOverviewTable.jsx:315` | `לא נמצאו הזמנות לפי החיפוש` | **(prior, 0 loading hits)** wording is search-flavored but this is the main bookings list; confirm whether the string is the *no-data* empty or a *filtered* empty. If pure filtered-search empty with no fetch, it is Tier C — decide on open. |
| A4 | `components/secretary/stall-map/HorseSidebar.jsx:243` | `לא נמצאו סוסים לפי החיפוש` | **(prior, 0 loading hits)** likely search-empty (Tier C) — but the sidebar also loads horses; confirm whether an initial-load flash exists. |

### Tier B — gated but hand-rolled (cosmetic dedup; lower priority)

| # | File : anchor | Current empty string | Notes |
|---|---|---|---|
| B1 | `components/secretary/workers/WorkersTable.jsx:80-89` | `לא נמצאו עובדים להצגה` | **(read)** gates on `props.loading` with a hand-rolled loading row (`טוענת עובדים...`, :69-78) and hand-rolled empty. Swap both to shared primitives (`colSpan={7}`). |
| B2 | `components/secretary/change-tracking/ChangeRequestsTable.jsx:257-283` | `אין בקשות…` (filter-empty + true-empty) | **(read)** already uses `DataTableLoadingState`. Two hand-rolled empties: filter-empty (:261-275, has "ניקוי סינון" button — **keep as-is**) and true-empty (:277-283 — may swap to `DataTableEmptyState colSpan={7}`). Do not merge the two. |
| B3 | `pages/secretary/CompetitionPaidTimePage.jsx:618` | `אין בקשות ממתינות להצגה` | **(prior, has loading)** second list on the page (pending requests); the slots table above it (`:349`) already uses shared. Confirm gate; align to shared. |
| B4 | `components/superuser/ReiningPatternsTable.jsx:17` | `אין עדיין מסלולי ריינינג להצגה.` | **(prior, 1 loading hit)** the only superuser table NOT already on the shared empty state. Confirm gate; migrate. |
| B5 | `components/secretary/competition-payments/PayersList.jsx:380` | `אין משלמים להצגה` | **(prior, 1 loading hit)** confirm gate; migrate (list, may be `LoadingSpinner`). |
| B6 | `components/secretary/ClassesInCompetitionSection.jsx:43` | `אין מקצים ליום זה` | **(prior, 1 loading hit)** per-day empty inside the creation wizard; confirm whether it is data-fetch or purely derived from already-loaded classes (if derived, Tier C). |

### Tier A/B — modal-embedded lists (confirm gate on open)

These render inside modals that fetch their own data. Higher `loading` hit-counts
suggest gates exist (lean Tier B) but the empty markup is hand-rolled.

| # | File : anchor | Current empty string | Notes |
|---|---|---|---|
| M1 | `components/secretary/competition-summary/SummaryDetailsModal.jsx:391` | `אין נתונים להצגה` | **(prior, 4 loading hits)** |
| M2 | `components/secretary/competition-summary/SummaryPaymentsBreakdownModal.jsx:89` | `אין תשלומים להצגה` | **(prior, 6 loading hits)** |
| M3 | `components/secretary/competition-summary/FederationMatchingSuggestionsModal.jsx:66,276,373` | `לא נמצאו הצעות התאמה כרגע.` / `לא נמצאו קבלות זמינות` / `לא נמצאו משלמים` | **(prior, 8 loading hits)** three separate empties; classify each. |
| M4 | `components/secretary/competition-payments/FederationCoverageApplyModal.jsx:375,558` | `לא נמצאו יתרות להצגה` / `לא נמצאו שיוכים ליתרה זו` | **(prior, 5 loading hits)** two empties. |
| M5 | `components/secretary/paid-time/AutoSchedulePreviewModal.jsx:114,352` | `אין כרגע בקשות…` / `emptyMessage="אין בקשות שלא שובצו"` | **(prior, 9 loading hits)** `:352` is an `emptyMessage` prop passed to a child list — trace the child. |
| M6 | `components/secretary/paid-time/PaidTimeSlotRegistrationsModal.jsx:235,237` | `emptyMessage="אין בקשות ממתינות"` | **(prior, 5 loading hits)** `emptyMessage` prop to a child list component — trace it. |
| M7 | `components/secretary/competition-form/DuplicateCompetitionSetupSection.jsx:1070,1555` | `לא נמצאו תחרויות קודמות…` / `לא נמצאו שופטים לענף שנבחר.` | **(prior, 19 loading hits)** large wizard section; `:1591` `noResultsText` is a picker (Tier C). Classify the two list empties. |

---

## Tier C — explicitly OUT of scope (do NOT migrate)

Listed so they are not swept in by a naive grep. These are search-empties,
per-field "not set", or auth/error banners — none are loading-vs-missing.

- `components/common/CustomDropdown.jsx:131` — dropdown search-empty.
- `components/common/MultiSelectPicker.jsx:126` — picker `noResultsText`.
- `components/secretary/competition-form/CompetitionDetailsSection.jsx:237` — picker `noResultsText`.
- `components/secretary/ClassInCompetitionModal.jsx:864` — picker `noResultsText`.
- `components/secretary/competition-form/DuplicateCompetitionSetupSection.jsx:1591` — picker `noResultsText`.
- `components/secretary/competition-summary/FederationMatchingSuggestionsModal.jsx` — the `noResultsText`/picker-flavored strings only (the *list* empties there are M3).
- `pages/secretary/ProfileSettingsPage.jsx:332` / `components/secretary/profile-settings/RanchProfileCard.jsx:103` — `לא הוגדר מיקום` per-field.
- `components/secretary/stall-map/StallCell.jsx:86` — `ריק` cell label.
- `components/secretary/shavings/AddShavingsOrderModal.jsx:290,429` — price-absent form hint (`לא נמצא מחיר פעיל לנסורת`), not a list.
- `components/secretary/shavings/ShavingsSlaBadge.jsx:12` — SLA badge label text.
- `context/AuthContext.jsx:170,215`, `pages/shared/ChangePasswordPage.jsx:51,56,176`, `pages/secretary/SelectRanchPage.jsx:105` — auth/error banners.
- `components/secretary/competition-payments/CreatePaymentModal.jsx:463` — form validation hint.
- `components/secretary/competition-payments/FederationCoverageApplyModal.jsx:192` — inline explanatory text (not the list empties M4).
- `components/secretary/competition-summary/FinancialProjection*/FinancialActualPanel/FinancialComparisonPanel` — projection panels render ranges, not fetched lists; leave to their own best-effort loaders.

---

## Implementer checklist for CAP-1

1. Open each Tier A / B / M site; confirm its tier (grep priors are not proof).
2. For Tier A: thread a `loading` prop and add the 3-state (`DataTableLoadingState`
   + `DataTableEmptyState`, or `LoadingSpinner` for non-table lists).
3. For Tier B/M: swap hand-rolled markup to the shared primitives, keeping any
   specific `message` and any action-bearing empty (B2 filter-empty) intact.
4. Keep `colSpan` equal to the visible column count (reuse computed counts).
5. If a site turns out to be Tier C on open, leave it and note it — do not force it.
6. `npm run build` + `npm run lint` clean at the end; no new lint warnings from
   removed imports.
