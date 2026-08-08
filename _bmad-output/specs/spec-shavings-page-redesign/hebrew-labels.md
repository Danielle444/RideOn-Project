# Hebrew Label Catalog — for Oren's approval

RTL Hebrew UI. These are the user-facing strings the redesign introduces. **Approve or edit each;**
the #30 delay wording is the one Oren specifically asked to see (now phrased around *seen / delivered*,
since approval is removed). Where a duration appears, it is templated from
`SHAVINGS_SLA_THRESHOLD_HOURS` (single source), not hardcoded.

## Page chrome

| Key | Proposed Hebrew | Notes |
|---|---|---|
| Page title | הזמנות נסורת | reuse of the existing title |
| Add-order button | הוסף הזמנה | opens the #32 modal |
| Empty state | אין הזמנות נסורת לתחרות זו | no orders |
| Loading | טוען הזמנות... | |
| Error | שגיאה בטעינת הזמנות הנסורת | via `getErrorMessage` fallback |

## Grouping toggle (CAP-2)

| Key | Proposed Hebrew |
|---|---|
| Toggle label | קיבוץ |
| Group by ranch | לפי חווה |
| Group by status | לפי סטטוס |

## Status chips (derived — CAP-3)

| Derived state | Proposed Hebrew | Notes |
|---|---|---|
| Pending (unclaimed) | ממתין לטיפול | |
| Seen (claimed, undelivered) | בטיפול | matches Spec 1's worker "Seen" label |
| Delivered | סופק | matches Spec 1's toast "ההזמנה סופקה" |
| Delivered, no photo (unverified) | סופק · ללא תמונה | only renders if DEP-1 exposes `DeliveryPhotoUrl`; else the chip is just "סופק" |

## SLA delay flags (#30 — the wording Oren asked to review)

| Key | Proposed Hebrew | Rule |
|---|---|---|
| Needs-attention section title | הזמנות שדורשות טיפול | pinned section (Oren-approved 2026-07-26) |
| Needs-attention subtitle | הזמנות שחורגות מזמן היעד | Oren-approved |
| Rule A badge (unclaimed too long) | טרם נלקח לטיפול · מעל {N} שעות | `WorkerSystemUserId` null, `now − created > N h` |
| Rule B badge (undelivered too long) | בטיפול · מעל {N} שעות ללא אספקה | claimed, `Delivered` null, `now − seen > N h` |

`{N}` = `SHAVINGS_SLA_THRESHOLD_HOURS` (3). Original issue said "אושר תוך 3 שעות" (approved within 3h);
approval is removed, so Rule A is "picked up" (נלקח לטיפול) and Rule B is "delivered after being seen".

## Add-order form (#32 — CAP-5)

| Key | Proposed Hebrew |
|---|---|
| Modal title | הוספת הזמנת נסורת |
| Ranch field label (required) | חווה |
| Ranch validation (empty) | יש לבחור חווה |
| Price field label | מחיר נסורת |
| No active price | לא נמצא מחיר פעיל לנסורת |
| Stalls field label | תאים |
| No stalls to pick | אין תאים זמינים לחווה שנבחרה |
| Delivery: now / later | אספקה עכשיו / במועד מאוחר |
| Bag quantity | כמות שקים |
| Notes | הערות |
| Submit | שמור הזמנה |
| Success | הזמנת הנסורת נוספה בהצלחה |
| Error | אירעה שגיאה ביצירת הזמנת הנסורת |

## Open wording decisions

- Rule A/B badge phrasing above — approve or reword.
- "סופק · ללא תמונה" vs a plainer "ללא תמונה" pill next to "סופק".
- Whether ranch label should read "חווה משתתפת" (participating ranch) rather than plain "חווה".
