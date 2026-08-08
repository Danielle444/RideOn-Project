# Hebrew Strings Catalog — Change Tracking Polish

Authoritative copy for **CAP-3** (status translation), **CAP-4** (error mapping), and **CAP-5** (labels + harmonized phrasings). Current strings were read from source on 2026-07-27; file:line anchors are exact. **All replacement wording below is APPROVED (Oren, 2026-07-27) — ship exactly as written.**

All UI is Hebrew RTL.

---

## CAP-3 — Status must render in Hebrew everywhere

The **table** already translates status (`ChangeRequestsTable.jsx:52-61`):

| Backend `Status` | Hebrew (canonical) |
|---|---|
| `Pending` | `ממתינה` |
| `Approved` | `אושרה` |
| `Rejected` | `נדחתה` |

The **modal leaks raw English**: `ChangeRequestDetailsModal.jsx:286` renders `getValue(item, "status", "Status", "-")` directly. Fix: run the modal's status value through the same mapping (extract the table's translator to a shared helper, or replicate it). No raw `Pending`/`Approved`/`Rejected` may appear in the modal.

---

## CAP-4 — Backend / Postgres errors → Hebrew

The answer procs `RAISE` English on the paid backstop:
- `Cannot answer change request for a paid entry`
- `Cannot answer change request for a paid product request`

These reach the UI as raw `P0001` text today. Map at the point the answer call's error is caught (the hook's `answerRequest` catch, mirroring the existing `getErrorMessage(error, fallback)` convention used elsewhere in the app):

| Condition | Hebrew message (approved) |
|---|---|
| Paid-guard `P0001` (message contains `paid`) | `לא ניתן לאשר או לדחות בקשה עבור פריט ששולם.` |
| Any other backend/network failure | `הפעולה נכשלה. נסי שוב מאוחר יותר.` (generic fallback) |

Rule: **never** surface raw proc/exception text. Match on the leaked English substring only as a classifier; the displayed string is always Hebrew via the toast.

Note: after CAP-1 hides paid Pending rows, the paid-guard `P0001` should be effectively unreachable from the UI — CAP-4 is the safety net for the residual race (a request paid between list-load and click) and for all other backend errors.

---

## CAP-5 — Labels

| # | Where (file:line) | Current | Replacement |
|---|---|---|---|
| 5 | `ChangeRequestsSummaryCards.jsx:13` | `סה״כ בטאב` | `סה״כ בסטטוס זה` |
| 6 | `ChangeRequestDetailsModal.jsx:307` (DetailRow label) | `ישות` | `נושא הבקשה` |
| 6 | `ChangeRequestsTable.jsx:270` (column header) | `ישות` | `נושא הבקשה` — keep header and modal identical |
| 9 | `ChangeRequestDetailsModal.jsx:188` | `לאחר אישור` | `חיוב לאחר אישור` |
| 9 | `ChangeRequestsTable.jsx:205` | `לאחר אישור: {amount}` | `חיוב לאחר אישור: {amount}` |
| 8 | `ChangeRequestsFilters.jsx:20` (filter subtitle) | `חיפוש לפי מבקש, סוג בקשה, סוס, מוצר או פרטי שינוי` | `חיפוש לפי שם מבקש או פרטי הבקשה` (search matches `RequestedByName` + `EntityName` + `BeforeText` + `AfterText`) |

---

## CAP-5 (#7) — Harmonize the four entry/product × change/cancel phrasings

The same four concepts are worded inconsistently across three surfaces. Pick one canonical vocabulary and use it in the summary cards and the filter buttons alike.

Current inconsistency:

| Concept | Summary card | Source filter (`מקור בקשה`) | Type filter (`סוג בקשה`) | Proc `RequestType` |
|---|---|---|---|---|
| entry source | `בקשות מקצים` | `מקצים` | — | (`שינוי/ביטול מקצה`) |
| product source | `בקשות מוצרים` | `מוצרים` | — | (`שינוי/ביטול מוצר`) |
| change type | `שינויים` | — | `שינוי` | (`שינוי …`) |
| cancel type | `ביטולים` | — | `ביטול` | (`ביטול …`) |

Recommended canonical set — keep the two filter axes cleanly separate (source = entry/product, type = change/cancel) and make card labels echo the filter labels:

| Axis | Canonical terms |
|---|---|
| Source | `מקצים` / `מוצרים` |
| Type | `שינוי` / `ביטול` |

So summary cards read `בקשות מקצים` / `בקשות מוצרים` / `בקשות שינוי` / `בקשות ביטול` (from `שינויים`/`ביטולים`), matching the filter buttons exactly. The proc's localized `RequestType` strings (`שינוי מקצה` etc.) are **display-only** and are no longer used for filtering after CAP-2 — leave them as the proc emits them, or align them to the canonical set in a later pass (not required here).

---

## Empty-state copy (CAP-6)

| State | Hebrew message (approved) |
|---|---|
| No requests exist for this competition (unfiltered) | `אין בקשות שינוי או ביטול בתחרות זו.` |
| Requests exist but none match active filters | `אין בקשות התואמות את הסינון. נסי לנקות את הסינון.` (with the existing "ניקוי סינון" action nearby) |

## Approve + Reject confirmation copy (CAP-7) — both required

| Action | Confirmation prompt (approved) |
|---|---|
| Approve | `אישור הבקשה יעדכן את החיובים במערכת ועשוי להוסיף קנס. להמשיך?` |
| Reject (required) | `לדחות את הבקשה? לא ניתן לשחזר פעולה זו.` |

## Post-start full-charge cancellation label (CAP-10)

Shown on a cancellation approved on/after competition start (the branch where `AmountAfter` = full original charge):

> `ביטול לאחר תחילת התחרות — החיוב המלא נשמר.`
