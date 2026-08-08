# Component contracts — extracted shells, cards, presenters, and the DroppableBox extension

Load-bearing detail for the seven capabilities in `SPEC.md`. Every class string below is copied from the live reference so the refactor is a lift, not a redesign. **Verified** = read in this session; **inferred** = derived, confirm on contact.

---

## File map (verified paths, all under `RideOnClient/rideon-client/web/src/`)

| Area | File | Role |
|------|------|------|
| A | `components/secretary/competition-summary/CompetitionSummarySection.jsx` | Reference shell + header (`:137-148`) + `SummaryAmountCards` host. Refit onto new shell/card. |
| A | `components/secretary/competition-summary/SummaryAmountCards.jsx` | `AmountCard` is the figure-card source. |
| A | `components/secretary/competition-summary/FinancialProjectionPanel.jsx` | Prediction tab. `BandCard` ≈ 90% of the shared card. |
| A | `components/secretary/competition-summary/FinancialComparisonPanel.jsx` | Comparison tab. Bare, `text-lg` header, lone verdict card. |
| A | `components/secretary/competition-summary/financialProjectionCopy.js` | All Hebrew strings for the three tabs (add labels here, not inline). |
| A **new** | `components/secretary/competition-summary/SummarySectionShell.jsx` | CAP-1 extract. |
| A **new** | `components/secretary/competition-summary/SummaryFigureCard.jsx` | CAP-1 extract. |
| B | `components/common/dnd/DroppableBox.jsx` | Shared primitive — extend for blocked state (CAP-4). |
| B | `components/common/dnd/DraggableItem.jsx` | Shared primitive — no change expected. |
| B | `components/secretary/stall-map/StallCell.jsx` | Assigned cell, ranch-first. |
| B | `components/secretary/stall-map/StallAssignmentSidebar.jsx` | Queue, horse-first, ranch-scoped. |
| B | `pages/secretary/CompetitionStallsPage.jsx` | `getDragTitle` overlay (`:31-39`), `handleDragEnd` block (`:105-126`), local `setToast` (`:86`), `ToastMessage` (`:353`). |
| B | `hooks/secretary/useCompetitionStallsPage.js` | `handleAssign` reads `item.bookingRanchName` (`:195`); `activeAssignments` (`:320`). |
| B | `components/secretary/paid-time/PaidTimeScheduleCell.jsx` | Assigned cell; `DraggableItem` wraps text only; Info/X buttons. |
| B | `components/secretary/paid-time/PaidTimeRequestCard.jsx` | Queue card; identity header at `:160-176`. |
| B | `pages/secretary/CompetitionPaidTimePage.jsx` | Overlay `getDragTitle` (`:86-96`), row divider `border-[#F3EAE4]` (`:702`), `ToastMessage` + `showToast`. |
| B | `hooks/secretary/useCompetitionPaidTimePage.js` | `handleDragEnd` occupied-block (`:563-565`), `onShowToast` wired. |

---

## CAP-1 — `SummarySectionShell.jsx`

Extracted from `CompetitionSummarySection.jsx:137-148`. Container + header only. The reference header row is a `grid` that also holds action buttons — the shell exposes those columns as an **optional slot**; it does not own the button logic.

```jsx
// props: title (string), description (string?), actions (node?), children (node)
<section className="rounded-[28px] border border-[#E6DCD5] bg-white p-8 shadow-sm">
  <div className={
    "mb-7 " + (actions
      ? "grid grid-cols-1 gap-5 xl:grid-cols-[1fr_260px_220px]"
      : "")
  }>
    <div>
      <h2 className="text-3xl font-black text-[#3F312B]">{title}</h2>
      {description ? <p className="mt-2 text-sm text-[#8A7268]">{description}</p> : null}
    </div>
    {actions /* CompetitionSummarySection injects its cash/invoice/secondary buttons here */}
  </div>
  {children}
</section>
```

- `CompetitionSummarySection` keeps `openFilePicker`, `handleFileChange`, `fileInputRef`, and all button JSX; it passes the rendered buttons as `actions`. The `actionError` / `actionSuccess` / `ImportResultBox` / `SummaryAmountCards` / categories table all move into `children`. **Net visual change: zero.** (Verified the header grid columns `xl:grid-cols-[1fr_260px_220px]` and the exact section/header classes.)
- Prediction and Comparison pass **no** `actions`, so the header collapses to the single title/description column.

## CAP-1 — `SummaryFigureCard.jsx`

Reconciles `AmountCard` (`SummaryAmountCards.jsx:5-35`, a clickable `<button>` that formats money) with `BandCard` (`FinancialProjectionPanel.jsx:6-25`, a static `<div>` with an availability/prompt/hint mode). Make it **presentation-only** — the caller passes an already-formatted `value` node; the card never formats.

```jsx
// props:
//   title (string)
//   value (node)              -> pre-formatted; ignored when available === false
//   colorClass (string?)      default "text-[#7B5A4D]"
//   onClick (fn?)             present -> render <button> (clickable), absent -> render as button disabled (static)
//   available (bool?)         default true; false -> render prompt instead of value (BandCard's absence≠zero)
//   prompt (node?)            shown when available === false
//   hint (node?)              optional sub-line under the value
const isStatic = !onClick;
<button type="button" onClick={onClick} disabled={isStatic}
  className={
    "min-w-0 rounded-2xl border border-[#E3D7D0] bg-white px-6 py-5 text-right shadow-sm disabled:cursor-default " +
    (onClick ? "cursor-pointer transition-colors hover:bg-[#FCF8F5]" : "")
  }>
  <p className="text-sm font-bold text-[#6D4C41]">{title}</p>
  {available !== false ? (
    <>
      <p className={"mt-3 break-words text-2xl font-black tabular-nums lg:text-3xl " + (colorClass || "text-[#7B5A4D]")}>
        {value}
      </p>
      {hint ? <p className="mt-2 text-xs text-[#8D6E63]">{hint}</p> : null}
    </>
  ) : (
    <p className="mt-3 rounded-xl border border-dashed border-[#D9C7BD] bg-[#FBF7F4] px-4 py-3 text-sm text-[#8D6E63]">
      {prompt}
    </p>
  )}
</button>
```

- **`SummaryAmountCards`** keeps its own `formatMoney` and maps each figure onto `SummaryFigureCard` (passing the formatted string as `value`, and `onClick` where it exists). The Actual grid must look unchanged — same `md:grid-cols-3 / md:grid-cols-4` wrapper, same colors (`text-[#2E7D32]`, `text-[#C62828]`, etc.).
- **`BandCard` is deleted**; Prediction renders `SummaryFigureCard` with `available`, `prompt`, `hint`, and the pre-formatted `formatMoneyRange(...)` / `formatCountRange(...)` string as `value`. This alone gives Prediction the missing `tabular-nums` + `lg:text-3xl`.
- Keep the `text-right` alignment already in both sources.

## CAP-2 — Prediction refit

- Replace the outer `<div className="space-y-5">` with `<SummarySectionShell title={copy.projectionTitle}>`; the caption band, the card grid (`grid-cols-1 md:grid-cols-2 xl:grid-cols-3`), and the advisories `<ul>` become its children.
- Caption band today: `rounded-2xl border border-[#E6D3C8] bg-[#FBEFE7] px-5 py-3`. **Reconcile:** swap the `#FBEFE7`/`#E6D3C8` accent for the reference surface family (`bg-[#FCFAF8] border-[#E6DCD5]`, mirroring `ImportResultBox`) so it doesn't read foreign beside Actual — keep both caption lines and their weight/size.
- Advisories (`Advisory`) unchanged.

## CAP-3 — Comparison refit

- Wrap in `<SummarySectionShell title={copy.comparisonTitle}>` (header now `text-3xl font-black` via the shell — drop the local `text-lg font-bold` `<h3>`).
- Above the existing verdict card, add a `grid grid-cols-1 gap-4 md:grid-cols-3` of `SummaryFigureCard`s:
  - **predicted band** — `value = formatMoneyRange(lo, hi)` = `formatMoney(entryIncomePredictedLo)`–`…Hi` (reuse `financialFormat`), neutral `colorClass`.
  - **actual** — `value = formatMoney(entryIncomeActual)`, `text-[#2E7D32]`.
  - **delta** — `value = formatMoney(deltaGap)`; see assumption in SPEC (nearest-band-edge signed gap). Prefix `+`/`−`.
- Keep `verdictLabel` and its green/amber card exactly; it renders below the figures inside the same shell.
- Add any new labels to `financialProjectionCopy.js` (do not hardcode Hebrew inline).

---

## CAP-4 — `DroppableBox` blocked over-state

Current (`DroppableBox.jsx`): `isOver && !disabled ? overClassName : ""`. Extend cleanly with a `blocked` flag + a `blockedOverClassName`; when hovering and blocked, show the blocked class instead of the accept class.

```jsx
// added props: blocked (bool?), blockedOverClassName (string?)
const activeOverClass = isOver && !disabled
  ? (blocked ? (blockedOverClassName || "") : (overClassName || ""))
  : "";
```

- **Stalls** (`StallCell`): pass `blocked={isOccupied}` and `blockedOverClassName="scale-105 border-red-400 bg-red-50"` (mirror the accept-highlight geometry, red palette). Occupied cells stay droppable (not `disabled`) so the hover fires.
- **Paid-time** (`PaidTimeScheduleCell`): pass `blocked={!!assignment}` and `blockedOverClassName="bg-red-50 ring-2 ring-red-400"` (mirror its `overClassName="bg-[#F5EDE8] ring-2 ring-[#795548]"`).

### Reject toasts

- **Stalls** — `CompetitionStallsPage.handleDragEnd` (`:123`): where it currently does `if (isOccupiedTarget) return;`, first raise the page-local toast:
  ```js
  if (isOccupiedTarget) {
    setToast({ isOpen: true, type: "error", message: "התא כבר תפוס" });
    return;
  }
  ```
  (`ToastMessage` is already mounted at `:353`; no hook change.)
- **Paid-time** — `useCompetitionPaidTimePage.handleDragEnd` (`:563`): where it does `if (timeCell.assignment) return;`:
  ```js
  if (timeCell.assignment) {
    onShowToast?.("error", "המשבצת כבר תפוסה");
    return;
  }
  ```
- Do not toast the "same source cell / same order" early-returns (those are no-op re-drops, not rejections).

---

## CAP-5 — Stalls shared identity label (ranch-first)

Extract a two-line presenter, e.g. `components/secretary/stall-map/StallBookingLabel.jsx`:

```jsx
// props: assignment/item (carries bookingRanchName, barnName||horseName, isForTack)
// line 1 (bold): bookingRanchName || "חווה לא ידועה"
// line 2 (sub) : isForTack ? "תא ציוד" : (barnName || horseName || "")
```

- **`StallCell`** already renders exactly this (`:69-75`) — refit it onto the shared component so cell and overlay share one source.
- **Overlay** (`CompetitionStallsPage.getDragTitle` at `:31-39` → the overlay box at `:341-347`): replace the horse-first single string with the shared two-line label. `activeItem` is either a queue `item` or an `assignment`; both carry `bookingRanchName` (verified `:195`) and `barnName||horseName`. **Cell ≡ overlay is the hard invariant.**
- **Queue** (`StallAssignmentSidebar`): keep `getItemTitle` horse-first. The sidebar is fed `page.selectedRanchItems` (one ranch, via `StallAssignmentRanchTabs`), so ranch is constant — do **not** stamp it per row. Optional: one ranch group header above the list. Per-row ranch = the redundancy trap; avoid.

## CAP-6 — Paid-time shared identity presenter (horse-first)

Extract the identity header, e.g. `components/secretary/paid-time/PaidTimeBookingLabel.jsx`:

```jsx
// horse (bold): barnName||BarnName||horseName||HorseName
// line 2 (sub): riderName + (productName ? " • " + productName : "")
// line 3      : "מאמן/ת: " + (coachName || "לא צוין")
```

- **`PaidTimeScheduleCell`** (`:70-78`) already renders this order — refit onto the shared component.
- **`PaidTimeRequestCard`** header region (`:160-176`): today it shows horse bold + `"רוכב/ת: " + riderName` only. Align it to the shared presenter's field order/styling (horse → rider • product → coach). Keep the card's type/batch pills and the session / smart-batch / notes blocks below untouched.
- **Overlay** (`CompetitionPaidTimePage.getDragTitle`, `:86-96`) stays horse-first — already matches the lead; no change needed beyond confirming it reads the same horse field.

## CAP-7 — Paid-time ergonomics

- **Whole-row handle** (`PaidTimeScheduleCell.jsx:63-90`): the assignment block is `flex items-center justify-between` with the `DraggableItem` (text) + the `X` button as siblings. Make the `DraggableItem` `flex-1` / `w-full` so the grab area fills the `1fr` cell; keep `X` as a flex sibling (outside the draggable) and `Info` absolute (`:49-61`). Both buttons already stop propagation on click (add `e.stopPropagation()` to `X` if not present); the `PointerSensor` `distance:8` activation constraint (`CompetitionPaidTimePage.jsx:230-234`) means a click without an 8px drag will not start a drag, so the buttons keep firing.
- **Divider** (`CompetitionPaidTimePage.jsx:702`): the row wrapper is `grid grid-cols-[88px_1fr] border-b border-[#F3EAE4] last:border-b-0`. Change `border-[#F3EAE4]` → `border-[#E6DCD5]` (the summary-shell family) for a visible line. Pure token swap.
