# bmad-spec SESSION PROMPT — Design Uniformity: Competition Summary + Drag-and-Drop

> **Paste this whole file as the opening message of a fresh `bmad-spec` session.** It is self-contained — you do not need the party-mode transcript that produced it. Produce the SPEC kernel + companions, then, as your final output, **write your implementation thoughts in bold, addressed to my colleagues** (see "Final output" at the bottom).
>
> **This is a party-mode triage handoff, not an implementation order.** The decisions below are locked; the *how* is yours to spec. Investigate against the live files before writing — mark what you read vs. inferred.

---

## Ground rules (RideOn house rules — apply throughout)

- **Web app only:** `RideOnClient/rideon-client/web`. React + Vite, Tailwind v4, `@dnd-kit`, RTL Hebrew UI.
- **No database or backend changes.** Zero stored-procedure edits, zero `.cs` edits. Everything here is front-end presentation + interaction. If any item *seems* to need a proc change, that item is out of scope — flag it, don't do it.
- **Everything is public:** new feature branch off `main`, push to public remote, open a PR. Do not merge; Oren merges.
- **Preserve behavior.** These are visual-consistency and interaction-polish changes. Do not change what data loads, what the assign/unassign endpoints do, or any money math.
- Match the surrounding code style: these files use `var`, `function` declarations, camelCase||PascalCase field fallbacks, and inline Tailwind. Don't "modernize" them.

---

## TOPIC A — Competition summary: three tabs, three designs → one design language

**Where:** `src/pages/secretary/CompetitionSummaryPage.jsx` renders three views via `FinancialProjectionTabs.jsx`:

| Tab | Component | Current design |
|-----|-----------|----------------|
| **תחזית / Prediction** (`TAB_PROJECTION`) | `FinancialProjectionPanel.jsx` | Bare `space-y-5` div — **no section shell**. `text-3xl` title, `bg-[#FBEFE7]` caption band, grid of `BandCard`s. |
| **בפועל / Actual** (`TAB_ACTUAL`) | `CompetitionSummarySection.jsx` (×2: מארגן, התאחדות) | **The reference design.** `rounded-[28px] border border-[#E6DCD5] bg-white p-8 shadow-sm` section shell, `text-3xl font-black` header + `text-sm text-[#8A7268]` description, `SummaryAmountCards` figure grid. |
| **השוואה / Comparison** (`TAB_COMPARISON`) | `FinancialComparisonPanel.jsx` | **No shell.** Header shrunk to `text-lg font-bold`, a single verdict card (amber/green). |

**Locked decision:** The **Actual** tab is the canonical house style. Prediction and Comparison must adopt the *same design language* — **not** identical content (Prediction is legitimately ranges + "absence ≠ zero" prompts; Comparison is a forecast-reliability verdict). Homogenize the **container, header hierarchy, and figure-card**, not the sentences.

**The 20/80 move (do this, don't rebuild the tabs):**

1. **Extract a shared section shell** from `CompetitionSummarySection.jsx` (lines ~137–148: the `<section rounded-[28px] … p-8 shadow-sm>` wrapper + the `text-3xl font-black` title / `text-sm text-[#8A7268]` description header). Suggested: `src/components/secretary/competition-summary/SummarySectionShell.jsx`. `CompetitionSummarySection` should then consume the shell too, so all three tabs share one source of truth.
2. **Extract a shared figure card** from `SummaryAmountCards.jsx`'s `AmountCard` (`rounded-2xl border border-[#E3D7D0] bg-white px-6 py-5`, label `text-sm font-bold text-[#6D4C41]`, number `mt-3 text-2xl font-black tabular-nums lg:text-3xl` + semantic color). Suggested: `SummaryFigureCard.jsx`. `BandCard` in Prediction is *already ~90% this* — it's just missing `tabular-nums` / `lg:text-3xl` and the shell around it. Reconcile them.
3. **Wrap Prediction** in the shared shell; its BandCard grid becomes the shared figure card. Keep its estimate caption, but bring the accent into the reference palette (don't leave the lone `#FBEFE7` band if it reads foreign next to Actual).
4. **Wrap Comparison** in the shared shell **and add context figures** *(Oren's explicit choice: "Shell + add context figures")*. The single verdict stays, but render the compared numbers as figure cards so the `p-8` box doesn't read empty: **predicted band (lo–hi), actual, and delta**. Bring the header up to the reference `text-3xl font-black` scale. Keep the green/amber verdict semantics from the current `verdictLabel` (on-target = green, biased-either-way = amber, no red).

**Guard:** don't couple the extracted shell to the cash-desk / invoice-import actions — those stay owned by `CompetitionSummarySection`. The shell is just container + header.

---

## TOPIC B — Drag-and-drop consistency (stalls + paid-time)

**Root cause:** both surfaces share the *primitives* (`src/components/common/dnd/DraggableItem.jsx`, `DroppableBox.jsx`) but every surface hand-rolls its own queue card, assigned cell, and drag overlay — so the same booking renders differently depending on where it stands. **Governing rule to spec: one presenter per surface, identical field order across queue / cell / drag-overlay.**

### B1 — Stalls: unify the name format *(Oren: "Ranch name first")*

Today they disagree:
- **Queue card** `StallAssignmentSidebar.jsx` → `getItemTitle` leads with **horse** (`barnName || horseName`).
- **Assigned cell** `StallCell.jsx` → leads with **ranch** (`bookingRanchName`), horse demoted to subtitle.
- **Drag overlay** `CompetitionStallsPage.jsx` → `getDragTitle` leads with **horse**.

**Locked:** ranch is the booking's identity. The two representations that **detach from context** — the **assigned cell** and the **flying drag overlay** — lead with **ranch name bold, horse name beneath**. Make the overlay match the cell.

**Nuance to honor (do NOT blindly paste ranch on every queue row):** the sidebar is already **ranch-scoped** (`StallAssignmentRanchTabs.jsx`) — every card in one tab shares the same ranch, so a bold ranch on each row becomes "B2W, B2W, B2W." In the **queue**, keep ranch as the identity via the section/tab grouping and let the **horse** disambiguate the individual row (or show ranch once as a group header). The invariant that must hold: **cell and overlay are identical, and both lead with ranch.** Spec the queue treatment so it reads as the same object family without the redundant chant.
- The queue item carries `bookingRanchName` (confirmed: `useCompetitionStallsPage.handleAssign` reads `item.bookingRanchName`), so all fields are available client-side.

### B2 — Paid-time: unify the name format (horse-first — there is no ranch here)

- **Queue card** `PaidTimeRequestCard.jsx`: bold `barnName||horseName` + "רוכב/ת: …".
- **Assigned cell** `PaidTimeScheduleCell.jsx`: bold `barnName||horseName` + rider • product + coach.
- **Overlay** `CompetitionPaidTimePage.jsx` `getDragTitle`: `barnName||horseName`.

These already lead horse-first — keep it. Spec a **single shared presenter** so the resting queue card and the assigned cell show the **same field order and styling**, and the overlay reads the same. The overlay is already shared across drag sources (both set `activeRequest`) — preserve that; just make the resting states match it.

### B3 — Occupied drop target = block-with-notice *(pre-authorized: "whatever's easier — block, or swap")*

Both surfaces currently **fail silently** on an occupied target:
- Stalls: `CompetitionStallsPage.handleDragEnd` → `if (isOccupiedTarget) return;`
- Paid-time: `useCompetitionPaidTimePage.handleDragEnd` → `if (timeCell.assignment) return;`

No toast, no visual feedback — the secretary can't tell if it worked. **A real swap needs stored-proc changes (out of scope — the code comments confirm the assign SP refuses it).** So: **block, with a notice.** Spec:
- `DroppableBox` gains a **blocked / not-allowed over-state** (e.g. red ring instead of the accept-highlight) when hovering an occupied target. It already takes `disabled` + `overClassName`; extend it cleanly rather than forking it.
- On a rejected drop, a standard reject **toast**: e.g. stalls `"התא כבר תפוס"`, paid-time `"המשבצת כבר תפוסה"` (writer to finalize Hebrew). Reuse the existing `ToastMessage` / `onShowToast` path already wired on both pages.

### B4 — Paid-time: whole row is the grab handle

In `PaidTimeScheduleCell.jsx` the `DraggableItem` wraps only the text block, so on a wide row only the name is grabbable — misleading. Spec: make the **draggable area fill the row** (minus the explicit Info and X buttons, which must keep working — mind `stopPropagation` and the drag activation constraint). The row is `grid grid-cols-[88px_1fr]`; the `1fr` cell content should be the handle.

### B5 — Paid-time: visible row dividers

The dividers between time-cell rows are `border-[#F3EAE4]` — effectively invisible on white. Spec a **visible divider** between consecutive slots (bump to a legible token consistent with the summary shell's `#E6DCD5` / `#EFE5DF` family). Pure design fix.

---

## Suggested scope split (spec as ordered, independently-shippable items)

1. **A-shell** — extract `SummarySectionShell` + `SummaryFigureCard`; refit `CompetitionSummarySection` onto them (no visual change to Actual). *Foundation.*
2. **A-prediction** — wrap Prediction in the shell + shared card; palette reconcile.
3. **A-comparison** — wrap Comparison in shell + context figure cards + header scale-up.
4. **B-dnd-block** — `DroppableBox` blocked over-state + reject toasts (stalls + paid-time). *Shared primitive, both surfaces.*
5. **B-stalls-name** — ranch-first cell + overlay; queue disambiguation.
6. **B-paidtime-name** — shared presenter for queue card ↔ cell.
7. **B-paidtime-ergonomics** — whole-row grab handle + visible dividers.

Items 1–3 and 4–7 are two independent tracks; note it so colleagues can parallelize.

## Out of scope / do not touch
- Any stored procedure, DAL, or `.cs`.
- The auto-schedule preview/apply flow, the money math, what data the endpoints return.
- A real stall/slot **swap** (deferred; needs SP work).
- Mobile app.

## Verification expectations to bake into the spec
- Run the web dev server and eyeball all three summary tabs side by side (open comp → after registration close → with actuals) for a shared look.
- Drag a booking: queue → overlay → cell must read as the same object (ranch-first for stalls).
- Drag onto an occupied cell on both surfaces: expect a blocked highlight + a toast, never silence.
- Grab a paid-time row anywhere on the row; confirm Info/X still fire.

---

## Final output (what this session must end with)

After producing the SPEC kernel + companions, **write a closing section titled "For the team" where the actionable guidance is in bold** — implementation thoughts addressed to my colleagues who will build this. Cover: the two parallel tracks, the "extract-shell-first" ordering, the ranch-first invariant and the queue-redundancy trap, and the "block-not-swap, no DB changes" boundary. Keep it skimmable — bold the decisions, plain-text the rationale. Then push the branch public and open the PR.
