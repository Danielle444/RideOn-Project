# Phase 7 — Hebrew strings (final)

Settled during scoping. Verbatim; do not paraphrase in implementation.

| # | Use | String |
|---|-----|--------|
| 1 | Predicted column header | לוח זמנים משוער |
| 2 | Live column header | לוח זמנים בפועל |
| 3 | Switcher tooltip | הצגת לוח הזמנים לפי משך ממוצע / מינימלי / מקסימלי למקצה |
| 3a | Switcher labels (verbatim) | רגיל / מינימום / מקסימום |
| 4 | Missing start-time nudge — *durations-only fallback only* (no assumed hour configured) | יש להזין שעת התחלה למקצה הראשון כדי להציג לוח הזמנים |
| 4a | Assumed-start nudge (HH:MM interpolated from config, not hardcoded) | לוח הזמנים מבוסס על שעת התחלה משוערת (HH:MM). יש להזין שעת התחלה למקצה הראשון על מנת לקבל לוח זמנים מדויק |
| 5 | Yellow tier note | שעת הסיום המשוערת גבולית |
| 6 | Orange / red tier note | שעת הסיום צפויה להיות מאוחרת מאוד |
| 7 | Apply button (advance) | הקדם את שעת ההתחלה ל-HH:MM |
| 8 | Apply button (set assumed start) | הכנס את שעת ההתחלה HH:MM |
| 9 | Suggestion insufficient after the 06:00 clamp | הקדמת שעת ההתחלה אינה מספיקה. יש לשקול לפצל את היום או להעביר מקצים |

## Strings added after the original seven

**4 and 4a are both live** and are not alternatives to each other — they render in different
states. 4 is the durations-only path, reached only when no `defaultfirstclassstarthour` is
configured; its "in order to display the schedule" wording is accurate there, because no
schedule renders. 4a is the assumed-start path, where a schedule *does* render and the
wording asks for a real time to make it accurate.

**8** is the button beside 4a — it writes the assumed hour to the day's first class, making
the assumption real. Approved 2026-07-21, replacing the draft label `קבע את שעת ההתחלה ל-`.
Note the shape differs from 7: no `ל-` connector, and the time follows a plain space.

**9** renders in addition to button 7, only when clamping to the 06:00 floor means the
offered start no longer resolves the overage. Approved 2026-07-21. It names splitting a day
and moving classes as *advice only* — neither is implemented, both are behind this phase's
scope fence.

## Resolved wording question

Tooltip 3 uses **משך ממוצע** for the regular state. Flagged that for reining and cutting
the regular value is not an average but the only value, so **משך רגיל** would be more
precise. Decision: strings 1–3 stand as drafted, including משך ממוצע.
