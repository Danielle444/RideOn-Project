# Component Structure — Redesigned Secretary Shavings Page

Grounds CAP-1/CAP-3/CAP-6. File tree, component tree, the hook, the web-service additions,
and the empty/loading/error states. Follows the competition-summary page's shape so the page
reads as native.

## Route & host (unchanged)

The page mounts inside `CompetitionWorkspaceLayout` with `activeItemKey="shavings"` (as today).
The layout supplies `competitionId`; `ActiveRoleContext` supplies `ranchId` (= host ranch). The
route entry in `router.jsx` stays; only the page's body is rebuilt.

## File plan

```
web/src/
  pages/secretary/
    CompetitionShavingsPage.jsx        ← REBUILT: shell + layout + hook wiring (thin)
  hooks/secretary/
    useCompetitionShavingsPage.js      ← NEW: all data + grouping + SLA + form state
  components/secretary/shavings/
    ShavingsGroupingToggle.jsx         ← NEW: Ranch | Status segmented control (URL-bound)
    ShavingsNeedsAttentionSection.jsx  ← NEW: pinned #30 delayed-orders block
    ShavingsGroup.jsx                  ← NEW: one group (ranch or status) header + table
    ShavingsOrdersTable.jsx            ← NEW: order rows (reuses SummaryTable look)
    ShavingsStatusChip.jsx             ← NEW: Pending/Seen/Delivered chip + unverified marker
    ShavingsSlaBadge.jsx               ← NEW: in-row delay badge
    AddShavingsOrderModal.jsx          ← NEW: #32 form (see add-order-form.md)
  services/
    shavingsOrderService.js            ← REWRITTEN: approval fns removed (Spec 1), reads/writes added
  utils/
    shavingsSla.utils.js               ← NEW: SLA_THRESHOLD constant + rule predicates (see sla-rules.md)
    shavingsGrouping.utils.js          ← NEW: group-by-ranch / group-by-status pure fns
```

Reuse (do not duplicate): `competitionSummaryService.getCompetitionSummaryShavingsDetails` /
`getCompetitionSummaryShavingsEntries` for the ranch rollup and optional row-expand richness;
the summary palette and `SummaryTable`/`SummaryAmountCards`/`CompetitionSummarySection` visual
patterns; the shared `getValue(item, camelKey, pascalKey, fallback)` casing-tolerant reader.

## Component tree

```
CompetitionShavingsPage
└─ CompetitionWorkspaceLayout (activeItemKey="shavings")
   └─ ShavingsContent  [useCompetitionShavingsPage(competitionId, ranchId)]
      ├─ page header ("הזמנות נסורת") + "הוסף הזמנה" button
      ├─ ShavingsGroupingToggle           (group=ranch|status, URL-bound)
      ├─ ShavingsNeedsAttentionSection    (delayed orders, always ungrouped, pinned top)
      ├─ groups.map →
      │  └─ ShavingsGroup (title + rollup stats)
      │     └─ ShavingsOrdersTable
      │        └─ row → ShavingsStatusChip + ShavingsSlaBadge + expand → (R3 detail, optional)
      └─ AddShavingsOrderModal            (mounted on demand)
```

## Hook contract — `useCompetitionShavingsPage(competitionId, ranchId)`

Owns everything; the page stays presentational. Returns:

- `loading`, `error`, `reload()`
- `orders` — the flat master list (all booking ranches; see `read-model.md`)
- `group` (`"ranch"|"status"`), `setGroup(next)` — writes URL search params
- `filterRanch`, `filterStatus`, setters — optional URL-bound filters
- `groups` — derived groups for the current `group` mode (from `shavingsGrouping.utils`)
- `needsAttention` — derived delayed orders (from `shavingsSla.utils`)
- `ranchRollup` — R1 rows for group headers / #29 counts
- add-order form surface (see `add-order-form.md`): `isAddOpen`, `openAdd()`, `closeAdd()`, `addForm`, `submitAdd()`

## Web-service additions (`shavingsOrderService.js`)

The current file exports only `getPendingDeliveryApprovals` / `approveDelivery` — **both removed
by Spec 1** (approval killed). Rebuild the module to export, mirroring the mobile service and the
existing controller routes:

| Function | Method + route | Backing proc |
|---|---|---|
| `getShavingsOrdersForCompetitionAndRanch(competitionId, ranchId)` | `GET /ShavingsOrders/by-competition-and-ranch` | #176 |
| `getStallBookingsForShavings(competitionId, ranchId)` | `GET /ShavingsOrders/stall-bookings-for-order` | #177 |
| `createShavingsOrder(payload)` | `POST /ShavingsOrders` | #169 |

R1 (ranch rollup) and R3 (row-expand richness) reuse the **existing**
`competitionSummaryService` functions — no new read functions there.

## States (CAP-6)

- **Loading:** centered "טוען הזמנות..." on the summary-page card treatment; no skeleton flash on regroup (regroup is client-side, no refetch).
- **Empty:** dashed-border card "אין הזמנות נסורת לתחרות זו" (matches `SummaryTable`'s "אין נתונים להצגה").
- **Error:** red-bordered banner with `getErrorMessage(error, "שגיאה בטעינת הזמנות הנסורת")` (summary-page convention).
- **Degenerate single ranch:** with one booking ranch (today's live reality), `group=ranch` renders one group with its header; the toggle stays enabled and switching to `group=status` still buckets by lifecycle. No empty-toggle or broken state.
- **Needs-attention empty:** when nothing is delayed, the section is omitted entirely (not an empty shell).
