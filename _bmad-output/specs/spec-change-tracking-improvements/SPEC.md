---
id: SPEC-change-tracking-improvements
companions:
  - hebrew-strings.md
  - backend-changes.md
  - ../../change-tracking-followups.md
sources: []
---

> **Canonical contract.** This SPEC and the files in `companions:` are the complete, preservation-validated contract for what to build, test, and validate. Source documents listed in frontmatter are for traceability only — consult them only if you need narrative rationale or prose color this contract intentionally omits.

# Change Tracking Page — Pre-Committee Polish + Two Functional Fixes

## Why

**A pain to fix before a hard deadline.** The secretary-web Change Tracking page (`מעקב שינויים`) — where a host secretary approves or rejects payer change/cancellation requests for entries and products (stalls/shavings) — is one of the surfaces shown to the committee reviewing this project in ~2 weeks. Today it has two real defects and a layer of rough Hebrew/UX. The defects: (1) a change/cancel request for an **already-paid** item becomes an un-clearable "zombie" — both answer procs `RAISE P0001` above the approve/reject split, so every click returns 400 and the raw English `P0001` text leaks to the UI; (2) the `סוג בקשה` type filter silently hides **all** product requests because it matches a hardcoded entry-only string. On top of that, the page leaks raw English `Status`, uses jargon labels no secretary will parse, phrases the same concept four different ways, and gives weak empty-state and action feedback. This pass makes the page correct and presentable without expanding scope into the deferred structural work (blocking paid requests at their mobile source; a refund engine).

## Capabilities

- **CAP-1**
  - **intent:** A change/cancellation request whose source item is already paid (and therefore un-answerable) never appears as a Pending row, and never inflates the pending badge.
  - **success:** For a competition containing a paid Pending entry request and a paid Pending product request, the secretary list shows neither while still showing every answered (Approved/Rejected) historical row; the ranch-wide "בקשות ממתינות" badge count equals the number of Pending rows actually rendered across the ranch. Verified by seeding/identifying a paid Pending request live and confirming it is absent from both the list and the count.

- **CAP-2**
  - **intent:** The `סוג בקשה` type filter can select product requests as well as entry requests.
  - **success:** With mixed entry and product requests present, choosing each type-filter option shows the correct non-empty subset; no filter selection makes all product requests vanish. The filter keys off the `IsCancelled` boolean, not a localized `RequestType` string.

- **CAP-3**
  - **intent:** Request status renders in Hebrew everywhere it is shown, including the details modal.
  - **success:** Opening the details modal for an Approved and for a Rejected request shows the Hebrew status (`אושרה` / `נדחתה`) identical to the table; no raw `Approved`/`Rejected`/`Pending` English string is visible anywhere on the page or modal.

- **CAP-4**
  - **intent:** Backend and Postgres errors surface to the secretary as intelligible Hebrew messages, never as raw proc/exception text.
  - **success:** Triggering a backend failure (e.g. the `P0001` paid-guard backstop, or a generic 400/500) shows a Hebrew message via the existing toast; the raw `P0001: Cannot answer change request for a paid ...` string never reaches the UI.

- **CAP-5**
  - **intent:** Page labels and request-type phrasings read as clear, consistent Hebrew a secretary understands.
  - **success:** Every string listed in `hebrew-strings.md` matches its approved replacement on screen: jargon labels are replaced (`סה״כ בטאב`, column `ישות`, `לאחר אישור:`), the four entry/product × change/cancel phrasings are harmonized between summary cards and filter buttons, and the over-promising filter subtitle is trimmed. No item from the string catalog is missed.

- **CAP-6**
  - **intent:** An empty result distinguishes "no requests exist for this competition" from "requests exist but none match the active filters."
  - **success:** With zero requests, the page shows a "none exist" message; with requests present but filtered out, it shows a distinct "none match filter" message that nudges the secretary to clear/adjust filters. The two states are visually and textually different.

- **CAP-7**
  - **intent:** The secretary confirms before either answering action (Approve or Reject) commits, because approval moves money / can auto-create a fine and both answers are irreversible.
  - **success:** Clicking Approve opens a confirmation naming what will happen (commits billing changes / may add a fine); clicking Reject opens its own confirmation. Cancelling either leaves the request Pending and untouched. Both actions require a confirmation step before the answer is sent.

- **CAP-8**
  - **intent:** During a row action, only the button the secretary pressed shows its loading state.
  - **success:** Pressing Approve on a row animates only the Approve button with its loading label; the Reject button on the same row stays idle (and vice-versa). Both buttons are disabled during the in-flight request, but only the pressed one shows the spinner/label.

- **CAP-9**
  - **intent:** Date ranges display in reading order under RTL (earlier date first, later date second).
  - **success:** A request whose range is 03/08–07/08 renders left-to-right within the RTL layout as the earlier date then the later date, not reversed. Verified on a request that carries a start/end date range.

- **CAP-10**
  - **intent:** A cancellation approved after competition start — which deliberately keeps the full charge — is labelled so the secretary understands why no money is refunded.
  - **success:** For a post-start cancellation (the branch where `AmountAfter` equals the full original charge), the row/modal shows a one-line Hebrew explanation that the full charge is retained because the cancellation is after the competition start.

- **CAP-11**
  - **intent:** The summary presents one coherent breakdown plus a total instead of five cards spanning two overlapping breakdowns.
  - **success:** The summary shows a single breakdown dimension plus an overall total; there is no pair of cards that double-count the same requests under two different groupings.

## Constraints

- The four procs (`usp_getsecretarycompetitionchangerequests`, `usp_gethostsecretarypendingchangerequestscount`, `usp_answerchangeentryrequest`, `usp_answerproductchangerequest`) are **live-only — none exist in the repo.** Verify the live body via Supabase MCP immediately before editing; never trust a repo `.sql` file for this feature. Any SQL applied to live must also be committed to the repo.
- The CAP-1 hide-filter must mirror the answer procs' **exact** paid definition (`billcharge.chargestatus='Paid'`, keyed by `sourcetype`/`sourceid` — see `backend-changes.md`). It must be **Pending-scoped** in the list proc so answered history is preserved, and applied identically in the count proc so the badge and list agree.
- The answer-proc `P0001` paid-guards **stay in place** as a backstop. CAP-1 is defense-in-depth (hide the row), not a substitute for the guard.
- Adding CAP-1's predicate must not change any of the list proc's 20 output columns or their types, nor the count proc's single `PendingCount` column — the deployed backend reads results positionally/by name and must keep seeing the same shape. (A pure `WHERE`-clause addition satisfies this; no `DROP FUNCTION` needed.)
- Every DB write is shown to Oren as exact SQL and confirmed before it runs, then re-read afterward as proof it landed.
- Any `.cs` change is followed by `dotnet build` in `RideOnServer/` and a grep for call paths that bypass the changed logic. (This pass is expected to be frontend + DB-proc only; a `.cs` edit is likely only if CAP-4's error mapping reaches the controller/BL layer.)
- All UI is Hebrew RTL. Exact approved strings live in `hebrew-strings.md` and are authoritative over any phrasing in this kernel.

## Non-goals

- **Blocking paid change/cancel requests at their source** (the mobile payer creation flow / creation procs) — the correct long-term fix, explicitly deferred. See `change-tracking-followups.md`.
- **Any refund/credit/edit path for a secretary** who encounters a paid request — no refund engine exists and none is built here.
- **Optional cleanups:** removing the dead camelCase dual-casing in the hook/table/modal, extracting the duplicated `buildChangedFields`, adding pagination, and broader accessibility work — all deferred.
- **Re-doing already-shipped uncommitted polish** (ToastMessage feedback, reworded approve/reject copy, de-duplicated `חיוב`/`סכום` money line) — context only, not in scope.

## Success signal

At the committee demo, the secretary opens Change Tracking for a real competition, sees only actionable Pending requests (no zombie rows, no English error), reads labels and statuses that are entirely coherent Hebrew, filters by type without product requests disappearing, and is asked to confirm before an approval moves money — with the pending badge matching what's on screen. Nothing on the page requires a verbal explanation to be understood.

## Assumptions

- The already-shipped uncommitted frontend polish will be committed as part of, or alongside, this work; this spec builds on top of it rather than reverting it.
- CAP-11's "single breakdown" is the entry-vs-product (or change-vs-cancel) split plus a total; the exact chosen dimension is a small design call left to implementation, constrained only by "no two cards double-count the same requests."
- CAP-2's `סוג בקשה` filter is a change-vs-cancel axis (mapped to `IsCancelled`), kept separate from the existing source axis (`מקור בקשה`, entry/product) — not merged into one filter.

All prior open questions are resolved (Oren, 2026-07-27): all Hebrew wording in `hebrew-strings.md` is approved as written; the search box matches `RequestedByName`/`EntityName`/`BeforeText`/`AfterText` and the trimmed subtitle reflects that; Reject requires its own confirmation dialog (folded into CAP-7).
