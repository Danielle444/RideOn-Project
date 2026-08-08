# /bmad-spec handoff prompt — Change Tracking (מעקב שינויים) secretary page

> Paste the block below into a new session, after `/bmad-spec`.

---

Create a spec for improvements to the **secretary-web Change Tracking page (מעקב שינויים)** in the RideOn system. This is a pre-committee polish + one functional fix pass (~2 weeks out); scope tightly. Load the `ride-on-system-knowledge` skill first — its "Change Tracking" section has the verified facts. Verify all stored procedures **live via Supabase MCP** (they are NOT in the repo).

## System facts (verified 2026-07-27)
- Feature: host secretary approves/rejects payer change & cancellation requests for Entries and Products (stalls/shavings). Files: `pages/secretary/CompetitionChangeTrackingPage.jsx`, `hooks/secretary/useCompetitionChangeTrackingPage.js`, `components/secretary/change-tracking/*`, `services/changeTrackingService.js`.
- Backend: `ChangeTrackingController` → `BL/ChangeTracking.cs` → `DAL/ChangeTrackingDAL.cs` → 4 live-only procs: `usp_getsecretarycompetitionchangerequests`, `usp_gethostsecretarypendingchangerequestscount`, `usp_answerchangeentryrequest`, `usp_answerproductchangerequest`.
- The list proc returns 20 PascalCase columns incl. `IsCancelled`, `Status`, `RequestType` (`'שינוי/ביטול מקצה'` for entry, `'שינוי/ביטול מוצר'` for product), `AmountBefore/After`. No `IsPaid`/`CanAnswer` flag.
- Core rule (`P0001`): both answer procs `RAISE` on a `Paid` billcharge ABOVE the approve/reject split → a paid request is an un-clearable Pending zombie; the raw English `P0001` text leaks to the UI.

## IN SCOPE for this spec
**Functional**
1. **Hide paid, un-answerable Pending requests** — add `not exists(paid billcharge)` filter, **Pending-scoped** (keep answered history), to `usp_getsecretarycompetitionchangerequests` (both Entry + Product branches) AND mirror it in `usp_gethostsecretarypendingchangerequestscount` so the badge matches the list. (Answer-proc `P0001` guards stay as backstop.)
2. **Fix the type-filter bug** — `ChangeRequestsFilters.jsx` hardcodes `'שינוי מקצה'`/`'ביטול מקצה'`, so using the `סוג בקשה` filter silently hides ALL product requests. Filter on the `IsCancelled` boolean instead of the localized string.

**English leaks**
3. Details modal shows raw English `Status` (`Approved`/`Rejected`); translate like the table does (`אושרה`/`נדחתה`).
4. Map backend/Postgres errors (e.g. `P0001`) to Hebrew user-facing messages; never surface raw proc text.

**Copy / labels**
5. `סה״כ בטאב` → clear Hebrew (e.g. `סה״כ בסטטוס זה`).
6. Table column `ישות` (DB jargon) → `פריט` / `נושא הבקשה`.
7. Harmonize the four phrasings for entry/product × change/cancel across summary cards vs filter buttons.
8. Trim the filter subtitle that over-promises structured search fields.
9. `לאחר אישור:` label → `חיוב לאחר אישור`.

**Feedback / presentation**
10. Empty state must distinguish "none exist" from "none match the filter/search" (+ clear-filter nudge).
11. Add a confirmation on **Approve** (it moves money / can trigger a fine); consider one on Reject.
12. Row action spinner: only the pressed button should show its loading label (today both Approve+Reject animate together).
13. Date ranges render reversed in RTL (later date first) — fix bidi.
14. Cancellations that keep full charge (post-competition-start) look like a bug — add a one-line explanation label.
15. Summary cards: 5 cards / two overlapping breakdowns for a tiny dataset — consider consolidating to one breakdown + total.

## ALREADY SHIPPED (frontend-only, uncommitted — do NOT redo; treat as context)
- Action feedback moved from top-of-page banner to floating `ToastMessage`.
- Reworded approve/reject success copy.
- Removed the duplicated `חיוב`/`סכום` money line (money-label filter in `buildChangedFields`, table + modal).

## OUT OF SCOPE (deferred — see `_bmad-output/change-tracking-followups.md`)
- Block paid change/cancel requests at **mobile creation** (the real home for the rule).
- Secretary handling / refund path for paid edge cases (no refund engine exists).
- Optional cleanups: delete dead camelCase dual-casing (`getValue` camel||pascal); extract duplicated `buildChangedFields` to a shared util; pagination; broader a11y (label association, `aria-pressed`) unless trivially cheap.

## Constraints
- RideOn conventions: procs called positionally where applicable; verify proc bodies live before editing; **every DB write shown as exact SQL and confirmed by Oren before it runs**, re-read after. After any `.cs` change: `dotnet build`. Hebrew is the UI language (RTL).
- Deliverable: the SPEC kernel + companions.
