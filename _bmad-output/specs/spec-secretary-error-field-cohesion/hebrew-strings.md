# Hebrew strings — consolidated for Oren's sign-off

Nothing in CAP-1/3/5 finalizes until Oren approves this table. Two sections: **carried forward** (already in the app, shown for context, no change proposed) and **proposed new / changed** (need approval).

## Carried forward — no change (context only)

| String | Where | Meaning |
|---|---|---|
| `יש לבחור סוג מקצה` | class modal `FIELD_VALIDATION_RULES` | choose class type |
| `יש לבחור מגרש` | class modal / paid-time | choose arena |
| `יש להזין עלות מארגן (0 ומעלה)` | class modal | enter organizer cost |
| `יש להזין עלות התאחדות (0 ומעלה)` | class modal | enter federation cost |
| `יש לבחור סוג פרס` | class modal prize row | choose prize type |
| `המקצה לא נשמר. יש למלא את השדות המסומנים.` | class form toast | validation-failure summary |
| `יש להזין שם תחרות` / `יש לבחור ענף` / `יש להזין תאריך התחלה` / `יש להזין תאריך סיום` | `validateDetailsForm` | details form required |
| `תאריך הסיום לא יכול להיות לפני תאריך ההתחלה` | `validateDetailsForm` | end before start |
| `תאריך סגירת הרשמה לא יכול להיות לפני תאריך פתיחת הרשמה` | `validateDetailsForm:170` | registration end before open |
| paid-time set (timing/day/time-of-day/arena/start/end + toasts) | `PaidTimeSlotInCompetitionModal` | already approved (system-knowledge) |

## Proposed new / changed — NEED SIGN-OFF

| # | Proposed string | Where it will be used | Note |
|---|---|---|---|
| 1 | `יש להזין שם פרטי בעברית` | Judge form — inline error, empty Hebrew first name (CAP-5) | replaces generic catch-all for this field |
| 2 | `יש להזין שם משפחה בעברית` | Judge form — inline error, empty Hebrew last name (CAP-5) | " |
| 3 | `יש לבחור לפחות ענף אחד` | Judge form — inline error, no ענפים selected (CAP-5) | backend requires `fieldIdsCsv`; client currently has no message — this makes the backend English message unreachable |
| 4 | `השופט לא נשמר. יש למלא את השדות המסומנים.` | Judge form — form-level summary toast/banner on validation failure (CAP-5) | mirrors the class-form summary shape |
| 5 | `תאריך סגירת ההרשמה לא יכול להיות לפני תאריך פתיחת ההרשמה` | Registration-end date — **inline/at-picker** message, lower bound (CAP-6) | **reuse the carried save-time string verbatim** (row above) — do not introduce a variant |
| 6 | `תאריך סגירת ההרשמה חייב להיות עד תחילת התחרות` | Registration-end date — **inline/at-picker** message, upper bound vs competition start (CAP-6) | **CONFIRMED needed** — Oren set CAP-6 to guard both bounds. Wording draft; approve or adjust. |

**Open copy questions for Oren:**
- Row 6 wording: `חייב להיות עד תחילת התחרות` (must be by the competition start) — approve, or prefer e.g. `לא יכול להיות אחרי תחילת התחרות`?
- Judge form-level summary (row 4): confirmed to follow the CAP-2 uniform pattern — in-modal banner **and** page toast, same string. Approve the string text.
