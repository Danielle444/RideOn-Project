# Implementation prompt — Design Uniformity: Competition Summary + Drag-and-Drop

> **Run this cold.** You do not need the conversation that produced it. Read the two contract files next to this one first: **`SPEC.md`** (the five-field kernel — Why, Capabilities CAP-1…7, Constraints, Non-goals, Success signal) and **`component-contracts.md`** (exact props, Tailwind tokens, file/line map). This prompt tells you how to execute; those two tell you what is correct.

## What you are building

Two independent front-end tracks in the **RideOn secretary web app** (`RideOnClient/rideon-client/web`, React + Vite, Tailwind v4, `@dnd-kit`, RTL Hebrew). Both are **visual-consistency + interaction-polish** work. You are changing how things look and how a drop is acknowledged — **not** what data loads, what the assign/unassign endpoints do, or any money math.

- **Track A (summary tabs):** CAP-1 → CAP-2 → CAP-3. Make the three financial tabs (תחזית / בפועל / השוואה) share one design language, using the "בפועל" (Actual) tab as the reference. Extract a shell + figure card first, then refit the other two tabs.
- **Track B (drag-and-drop):** CAP-4 → CAP-5 → CAP-6 → CAP-7. Make stalls + paid-time bookings render identically across queue / cell / drag-overlay, and block occupied-target drops with a red hover state + a toast instead of silent failure.

The tracks are independent and can be built by two people in parallel. Within Track A, **CAP-1 is the foundation — do it first** (the other two consume its components).

## Execution rules (standing — do not skip)

- **New feature branch off `main`** (e.g. `claude/design-uniformity-summary-dnd`). Never commit to `main`. Never merge, integrate, or delete branches — **Oren merges.** Before any integration, confirm no other session is active in this worktree.
- **Push to the public remote** (`git push -u origin <branch>`) and **open a PR against `main`.** Leave nothing only local. Do not merge the PR.
- **Investigate first.** Before editing a file, read it and the endpoint/hook it consumes. Mark what you verified vs. inferred. If a path or the spec is wrong on contact, **flag it — don't silently fix and move on.**
- **Frontend only.** No `.cs`, no stored procedures, no DAL. If any item looks like it needs a backend change, **stop and raise it** — it is out of scope by definition (a real occupied-target *swap* is the known example; you are doing block-with-notice instead).
- **Match the surrounding style:** `var`, `function` declarations, `camelCase || PascalCase` field fallbacks, inline Tailwind. Do **not** modernize (no arrow-everything, no TS, no prop-types churn).
- **Preserve behavior.** CAP-1 in particular is a pure refactor: the Actual tab must render pixel-identical afterward.
- Before the PR, from `RideOnClient/rideon-client/web`: `npm run lint` and `npm run build` must pass.

## Definition of done (per capability — full detail in SPEC.md)

- **CAP-1** — `SummarySectionShell.jsx` + `SummaryFigureCard.jsx` exist; `CompetitionSummarySection` + `SummaryAmountCards` refit onto them; Actual tab visually unchanged; cash/invoice buttons still work and still live in `CompetitionSummarySection`.
- **CAP-2** — Prediction (`FinancialProjectionPanel`) renders inside the shell; `BandCard` deleted in favor of `SummaryFigureCard`; `#FBEFE7` caption band reconciled to the reference palette; estimate caption + advisories intact.
- **CAP-3** — Comparison (`FinancialComparisonPanel`) inside the shell with a `text-3xl font-black` header; three figure cards (predicted band, actual, delta); verdict card unchanged (green/amber, no red).
- **CAP-4** — `DroppableBox` extended with a blocked over-state; occupied drops show a red ring + fire a reject toast on **both** surfaces; no assign call on a blocked drop.
- **CAP-5** — stalls cell ≡ overlay, both ranch-first via one shared label; queue stays horse-first, no per-row ranch.
- **CAP-6** — one shared identity presenter drives the paid-time cell and the queue-card header (horse → rider • product → coach); overlay stays horse-first.
- **CAP-7** — paid-time row is grabbable across its `1fr` width (Info/X still fire); row divider bumped to a legible token.

## Verify before the PR (run the dev server)

1. **Summary look:** open a competition summary and tab across תחזית / בפועל / השוואה — same shell, same header scale, same figure cards. Check an **open** comp (Prediction populated, Actual/Comparison gated), and a comp **after registration close with actuals** (all three live). Screenshot the three side by side.
2. **Stalls identity:** enter stall-assignment mode, drag a booking. Queue row, drag overlay, and the assigned cell must read as the **same object — ranch-first** in the cell and overlay.
3. **Paid-time identity:** same drag test — horse-first, same field order in queue card, overlay, and cell.
4. **Block-with-notice:** on both boards, drag onto an **occupied** target — expect a **red blocked ring** on hover and a **toast** on release, never silence. Confirm the booking did not move.
5. **Row ergonomics:** grab a paid-time row from anywhere across its width; confirm the **Info** and **✕** buttons still fire.

Note in the PR description what you verified vs. what you couldn't (e.g. if you lacked a comp with actuals to exercise Comparison).

---

## For the team

Read `SPEC.md` and `component-contracts.md`, then this. The rationale is plain text; **the decisions are in bold.**

- **These are two independent tracks — split them across two people and run them in parallel.** Track A (CAP-1→2→3, the summary tabs) touches only `components/secretary/competition-summary/*`. Track B (CAP-4→7, drag-and-drop) touches `components/common/dnd/*`, `stall-map/*`, `paid-time/*`, and the two pages/hooks. They don't overlap, so there's no merge contention — but keep them as **separate PRs** so Oren can review and merge each on its own.

- **On Track A, extract the shell and the figure card first (CAP-1), and prove the Actual tab is unchanged before you touch the other two tabs.** Everything downstream consumes those two components; if CAP-1 drifts the Actual tab even slightly, you've turned a refactor into a redesign and lost the reference. Refit `CompetitionSummarySection` onto the new components, eyeball it against `main`, *then* build CAP-2 and CAP-3 on top. **The shell owns container + header only — the cash-desk and invoice-import buttons stay in `CompetitionSummarySection` and are injected through the optional `actions` slot.** Don't let the shell swallow that logic; that coupling is exactly what the guard forbids.

- **For stalls, the one invariant that must hold is: the assigned cell and the drag overlay are the same presenter output, both ranch-first.** Those are the two representations that float free of context, so ranch is their identity. **Do not "fix" the queue by stamping the ranch on every row** — the sidebar is already scoped to one ranch by the tab you're standing in, so a bold ranch per row just chants "B2W, B2W, B2W." The queue stays horse-first (that's the disambiguator); a single ranch group header is fine if you want the family cue. Cell ≡ overlay is the rule; the queue is deliberately allowed to differ.

- **The occupied-target behavior is block-with-notice, not swap — and there are zero DB changes anywhere in this work.** A real swap evicts an occupant server-side and needs stored-procedure changes; the assign SP refuses it on purpose. So when a drop lands on an occupied target, you show a **red blocked ring** (extend `DroppableBox` cleanly with a `blocked` flag — don't fork it) and fire a **reject toast**, then return without calling the endpoint. Mind the two different toast paths: **stalls uses the page-local `setToast`; paid-time uses the hook's `onShowToast`.** If anything in your plan starts to look like it needs a `.cs` or a proc edit, stop — you've crossed the line and that item is out of scope.

- **CAP-3's "delta" is the one number you have to define.** The spec assumes the signed gap to the nearest band edge (within → ₪0, above → +overshoot, below → −undershoot) because it mirrors the existing verdict logic and invents no new math. It's client-side display only. If that reads wrong on screen, raise it in the PR rather than swapping in a midpoint formula silently — and put any new Hebrew labels in `financialProjectionCopy.js`, never inline.
