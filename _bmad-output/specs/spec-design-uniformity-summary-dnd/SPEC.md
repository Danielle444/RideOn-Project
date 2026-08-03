---
id: SPEC-design-uniformity-summary-dnd
companions:
  - component-contracts.md
  - implementation-prompt.md
sources:
  - SPEC-SESSION-PROMPT.md
---

> **Canonical contract.** This SPEC and the files in `companions:` are the complete, preservation-validated contract for what to build, test, and validate. `component-contracts.md` holds the exact props/token specs for the extracted components; `implementation-prompt.md` is the self-contained cold-start prompt the implementing colleague runs. The Stage-1 `SPEC-SESSION-PROMPT.md` is traceability only.

# Design Uniformity — Competition Summary Tabs + Drag-and-Drop Surfaces

## Why

A **vision to realize**: the secretary web app has grown two visible inconsistencies that make a polished product read as unfinished. (1) The competition-summary screen shows three financial tabs — תחזית / בפועל / השוואה — that were each built at a different time and look like three different products: only the "בפועל" (Actual) tab has the rounded card-shell, big black header, and figure-card grid; the other two float bare on the page with mismatched header sizes and a foreign accent color. (2) The stalls and paid-time drag-and-drop boards render the *same booking* differently depending on whether it sits in the queue, in an assigned cell, or under the cursor mid-drag — and both silently swallow a drop onto an occupied target, leaving the secretary unsure whether the action worked. These are presentation and interaction-polish defects, not behavior bugs: the data, the endpoints, and the money math are all correct. The work is to make the surfaces *look and behave as one system* without touching what they do. It matters now because these are the screens the secretary lives in daily, and the demo audience judges the product on exactly this coherence.

## Capabilities

- **CAP-1 — A-shell: extract the shared section shell + figure card**
  - **intent:** A developer can wrap any summary panel in one `SummarySectionShell` (container + title + description, optional actions slot) and render any figure with one `SummaryFigureCard`, both extracted from the Actual tab, so all three tabs draw from a single source of truth.
  - **success:** `CompetitionSummarySection` (the Actual tab, ×2) is refitted onto both new components and renders **pixel-identical** to before — the cash-desk / invoice-import buttons still work and still live in `CompetitionSummarySection`, not in the shell. The two new files exist under `components/secretary/competition-summary/`.

- **CAP-2 — A-prediction: homogenize the Prediction tab**
  - **intent:** The secretary sees the תחזית (Prediction) tab inside the same shell and figure-card language as Actual, while keeping its legitimately different content (income *ranges* and "absence ≠ zero" prompts).
  - **success:** `FinancialProjectionPanel` renders inside `SummarySectionShell`; its band figures use `SummaryFigureCard` (now with `tabular-nums` and `lg:text-3xl`); the lone `#FBEFE7` caption band is reconciled into the reference palette; the estimate caption and advisories remain. Side-by-side with Actual, the container/header/cards match.

- **CAP-3 — A-comparison: homogenize the Comparison tab and fill the box**
  - **intent:** The secretary sees the השוואה (Comparison) tab in the same shell with a reference-scale header, and the compared numbers rendered as context figure cards so the large box no longer reads empty around a lone verdict.
  - **success:** `FinancialComparisonPanel` renders inside `SummarySectionShell` with a `text-3xl font-black` header; three `SummaryFigureCard`s show **predicted band (lo–hi)**, **actual**, and **delta**; the single verdict card stays with its existing green (on-target) / amber (biased either way) semantics — **no red state**.

- **CAP-4 — B-dnd-block: block occupied drops with visible feedback (both surfaces)**
  - **intent:** When the secretary drags a booking over an already-occupied target on either the stalls map or the paid-time schedule, they see a distinct "blocked" hover state and, on release, a toast telling them why nothing happened — instead of silent failure.
  - **success:** `DroppableBox` is cleanly extended (not forked) with a blocked over-state that shows a red/not-allowed ring rather than the accept-highlight when hovering an occupied target. A rejected drop fires a reject toast on both surfaces (stalls via the page's local `setToast`; paid-time via the hook's `onShowToast`). No assign endpoint is called on a blocked drop (unchanged from today).

- **CAP-5 — B-stalls-name: ranch-first identity on cell and overlay**
  - **intent:** A stall booking reads as the same object in every stalls representation: the assigned cell and the flying drag overlay both lead with **ranch name bold, horse name beneath**, and the queue reads as the same object family without repeating the ranch on every row.
  - **success:** The assigned cell (`StallCell`) and the drag overlay (`CompetitionStallsPage.getDragTitle` → the shared presenter) are **identical**, both ranch-first, driven by one shared label component fed `bookingRanchName` (available client-side, `useCompetitionStallsPage.js:195`). The queue (`StallAssignmentSidebar`) stays horse-first because the sidebar is already ranch-scoped by `StallAssignmentRanchTabs`; a single ranch group header is acceptable, per-row ranch repetition is not.

- **CAP-6 — B-paidtime-name: one shared identity presenter (horse-first)**
  - **intent:** A paid-time booking shows the same field order and styling in the resting queue card and the assigned cell, and the drag overlay reads the same, so it is recognizably one object across states.
  - **success:** A single shared presenter renders the identity header (**horse → rider • product → coach**) consumed by both `PaidTimeScheduleCell` and the header region of `PaidTimeRequestCard`; the overlay (`getDragTitle`) remains horse-first and matches the lead. The queue card's extra blocks (session, smart-batch, notes) are preserved.

- **CAP-7 — B-paidtime-ergonomics: whole-row grab handle + visible dividers**
  - **intent:** The secretary can grab a paid-time schedule row by dragging anywhere on its content area, and can see the boundary between consecutive rows.
  - **success:** In `PaidTimeScheduleCell` the draggable area fills the `1fr` cell (the Info and X buttons still fire — mind `stopPropagation` and the `distance:8` activation constraint); the row divider on the grid wrapper (`CompetitionPaidTimePage.jsx:702`, currently `border-[#F3EAE4]`) is bumped to a legible token in the `#E6DCD5` / `#EFE5DF` family.

## Constraints

- **Frontend only.** No `.cs`, no stored-procedure, no DAL edits. If any item appears to need a backend change, stop and flag it — do not do it. (A real stall/slot *swap* needs SP work and is out of scope; block-with-notice is the sanctioned substitute.)
- **Preserve behavior exactly.** No change to what data loads, what the assign/unassign endpoints do, or any money math. New display values (CAP-3 delta) are derived client-side from data already on screen.
- **Actual tab is the reference; do not restyle it.** CAP-1 must be a pure refactor with zero visual change to `CompetitionSummarySection`.
- **The shell owns container + header only.** It must not absorb the cash-desk / invoice-import action logic — those stay in `CompetitionSummarySection`, injected through an optional slot.
- **Stalls invariant:** the assigned cell and the drag overlay must be byte-for-byte the same presenter output; the queue is deliberately allowed to differ (horse-first) to avoid the "B2W, B2W, B2W" redundancy.
- **Match surrounding code style:** `var`, `function` declarations, `camelCase || PascalCase` field fallbacks, inline Tailwind. Do not modernize.
- **New branch off `main`, pushed public, PR opened; Oren merges.** Never commit to `main`, never merge.

## Non-goals

- A real drag-to-**swap** of two occupied targets (stalls or paid-time) — deferred, needs stored-procedure work.
- Any change to the auto-schedule preview/apply flow.
- Changing tab *content/wording* — Prediction stays ranges + prompts, Comparison stays a reliability verdict. Only container, header hierarchy, and figure-card are homogenized.
- The mobile app.
- Rewriting the queue card into the exact same presenter as the cell for stalls (the queue is intentionally horse-first and richer).

## Success signal

Running the web dev server, a reviewer opens a competition summary and tabs across תחזית / בפועל / השוואה: all three sit in the same rounded shell with the same header scale and the same figure cards — nothing reads as a different screen. On the stalls board and the paid-time board, dragging a booking shows the same object identity in the queue, under the cursor, and in its assigned cell (ranch-first for stalls, horse-first for paid-time); dropping onto an occupied target flashes a red blocked ring and raises a toast instead of doing nothing; and a paid-time row can be grabbed anywhere across its width while its Info and ✕ buttons still work.

## Assumptions

- **CAP-3 delta** is the signed gap to the nearest band edge (within band → ₪0; above → +overshoot; below → −undershoot), because it mirrors the existing `verdictLabel` semantics and needs no midpoint invention. Purely client-side display — no endpoint or money-math change.
- **Reject-toast Hebrew** placeholders are stalls `"התא כבר תפוס"` / paid-time `"המשבצת כבר תפוסה"`, carried from the Stage-1 prompt; final wording is Oren's to confirm.
- The Prediction caption-band **palette reconcile** keeps the caption's dual-line copy and only swaps the `#FBEFE7`/`#E6D3C8` accent for a token already used by the Actual/Prediction figure family (e.g. the `#FCFAF8` / `#E6DCD5` surface), preserving the "this is an estimate" prominence.

## Open Questions

- CAP-3: confirm the **delta** definition (nearest-band-edge gap, as assumed) and whether the delta card should color green/amber to echo the verdict or stay neutral.
- Final Hebrew for the two reject toasts and for any new Comparison figure-card labels (predicted / actual / delta).
