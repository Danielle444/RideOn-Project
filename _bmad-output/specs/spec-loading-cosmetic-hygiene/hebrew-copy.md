# Hebrew copy — for Oren's sign-off

This spec is a **mechanism** change (loading-vs-missing wiring), not a copy rewrite.
The default plan preserves each surface's existing wording via the `message` prop.
The items below are the only places where a string could change; all need Oren's OK
before an implementer alters user-visible text.

## 1. Shared default empty string (no change proposed)

`DataTableEmptyState` already defaults to **`לא נמצאו נתונים להצגה`**. Surfaces that
today say something more specific KEEP their own message. So there is **no forced
unification** to sign off — this is here only to confirm the default is acceptable
as the fallback for any surface that has no specific message.

- Decision needed: **keep `לא נמצאו נתונים להצגה` as the shared default?** (recommended: yes)

## 2. Loading string (no change proposed)

`DataTableLoadingState` defaults to **`טוען נתונים...`**. Some hand-rolled loaders use
a gendered/specific variant, e.g. `WorkersTable` says **`טוענת עובדים...`**. Migrating
to the shared component would replace that with the generic `טוען נתונים...` unless a
`message` prop is passed.

- Decision needed: for migrated surfaces, **use the generic `טוען נתונים...`**, or
  **preserve each surface's specific loading text** via `message`?
  (recommended: generic default everywhere for consistency, unless Oren prefers the
  specific gendered forms — several current strings are feminine, e.g. `טוענת`.)

## 3. Strings that only change if a surface is migrated

If (and only if) these hand-rolled empties are swapped to the shared component
*without* passing their current text through `message`, their wording changes to the
shared default. The recommendation is to **pass the existing string through** so
nothing changes — but where the current wording is odd or inconsistent, Oren may
prefer to normalize. Flagged for his call:

| Surface | Current string | Recommendation |
|---|---|---|
| `ShavingsOrdersTable` (A1) | `אין נתונים להצגה` | keep, or normalize to default `לא נמצאו נתונים להצגה` |
| `PaymentChargesTable` (A2) | `אין שורות חיוב להצגה` | keep (specific, clear) |
| `SummaryDetailsModal` (M1) | `אין נתונים להצגה` | keep or default |
| `SummaryPaymentsBreakdownModal` (M2) | `אין תשלומים להצגה` | keep (specific) |
| `PayersList` (B5) | `אין משלמים להצגה` | keep (specific) |
| `ReiningPatternsTable` (B4) | `אין עדיין מסלולי ריינינג להצגה.` | keep (specific; drop trailing period for consistency?) |
| `CompetitionPaidTimePage` (B3) | `אין בקשות ממתינות להצגה` | keep (specific) |
| `ChangeRequestsTable` true-empty (B2) | `אין בקשות שינוי או ביטול בתחרות זו.` | keep (specific) |

The two mixed cases worth an explicit "אין" vs "לא נמצאו" convention decision:
current strings mix **`אין …להצגה`** and **`לא נמצאו …להצגה`**. If Oren wants one
convention across the app, that is a small extra pass — otherwise leave as-is per
"keep existing".

## 4. No new strings introduced

#28 (button removal), #62 (CSS), and #52 (dead-code) introduce **no** user-visible
Hebrew. Nothing to sign off there.

---

**Bottom line for Oren:** the safe default changes no wording. The only real
questions are (a) generic vs specific *loading* text on migrated tables, and (b)
whether to normalize the `אין…` / `לא נמצאו…` empty-message wording into one
convention. Both are optional polish, not required for the fix.
