# Phase 7 — Step 1 Gap Audit

**Scope:** what commit `9d6119a "schedule start"` actually built vs. what was settled in rounds 1–2.
**Verified against live:** Supabase project `sxplumrexbolpwqacpiz` (RideOnApp), read-only.
**Not verified:** nothing rendered in a browser; no test competition exercised yet.

---

## 1. BLOCKER — the stored procedure was never deployed

`usp_getscheduleconfigbyfieldid` exists as a repo file
(`RideOnDB/StoredProcedures/PostgreSQL/Individual/164_usp_GetScheduleConfigByFieldId.sql`)
but **does not exist in the live database**.

```sql
SELECT p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname LIKE '%scheduleconfig%';
-- []  (empty)
```

Consequence chain: `ScheduleConfigDAL` throws → controller returns 400 →
`loadScheduleConfig` catches and sets `scheduleConfig = null` →
`showScheduleColumns` is false → **no schedule columns render at all, with no error
surfaced to the secretary.** The `catch` is deliberately best-effort (same convention as
`loadPredictions`), so the feature fails completely silently.

**Action:** deploy proc 164. Everything else in this audit is untestable until then.

## 2. BLOCKER — assumed start time is the rejected option

Round 2 settled: *generic assumed start time + "please update" nudge*, explicitly over
durations-only. The code ships durations-only.

`classSchedule.utils.js:199-218` — when no class on a day has a `startTime`,
`computeDaySchedule` returns `hasOrigin: false` and emits duration only. No assumed-start
constant exists anywhere in `web/src`.

**Correction to my earlier read:** the nudge itself *is* implemented and renders correctly
(`renderScheduleCell`, on `!hasClockTime && isFirstOfDay`, Hebrew string #4 verbatim).
Only the assumed-start-time half is missing. I was wrong to say the nudge was absent.

**Open decision:** what is the generic assumed start? A hardcoded constant (08:00?),
a new `smartconfig` key (`defaultfirstclassstarthour`), or per-field? A smartconfig key is
consistent with how every other tunable in this feature is stored.

## 3. HIGH — expandable column groups are entirely unbuilt

Round 1 settled: restructure into three expandable groups (arena + judges, financial,
schedule) because the table already carries too much. The commit does the opposite —
appends two more columns, taking the table from 14 to 16.

Nothing in the diff touches grouping. This is a whole settled decision with zero
implementation.

## 4. HIGH — the gap is applied to every field, not just reining

Live `betweenclassgapminutes = 10`. `computeDaySchedule:222-224` adds it between every
adjacent pair of classes on every field. Per your latest direction it should apply only
after a class and only for reining.

Impact is not cosmetic: on a 12-class reining day the gap adds 110 minutes; applying it to
cutting or extreme inflates every finish time and can push a day into a tier it does not
belong in — which then triggers a push-earlier suggestion that shouldn't exist.

**RESOLVED.** The gap must never precede a day's first class — the current behaviour is
already correct on that point — and it must be removed entirely for every field except
reining. Cutting and extreme roll forward with no gap at all.

## 5. CLOSED — jumping and dressage are silently exempt

Live `fieldconfig`:

| fieldid | field | min | max | maxhorseclassesperday |
|---|---|---|---|---|
| 1 | ריינינג | 5 | 5 | 1 |
| 2 | קאטינג | 2.5 | 2.5 | 3 |
| 3 | אולארונד | NULL | NULL | 5 |
| 4 | אקסטרים | 5 | 7 | 5 |
| — | קפיצות | *no row* | | |
| — | דרסז | *no row* | | |

Jumping and dressage have no `fieldconfig` row, so the proc's `LEFT JOIN` yields NULL
bounds and `isScheduleExempt` treats them exactly like all-around — no schedule columns,
no explanation.

**CLOSED — intended.** Confirmed that jumping and dressage are meant to be silently exempt
alongside all-around. No `fieldconfig` rows to add. Worth keeping in mind that the
exemption is currently implicit (absence of a row) rather than declared, so if either field
ever gets a `fieldconfig` row for some other purpose, schedule columns would appear for it
as a side effect.

## 6. MEDIUM — the 06:00 clamp is silent *(already agreed to fix)*

`classSchedule.utils.js:251` clamps the suggestion to 06:00. If a day's overage needs an
05:15 start, the button offers 06:00 and says nothing about being insufficient — the
secretary accepts it and still finishes late. Agreed: add explicit text.

## 7. MEDIUM — post-midnight times render unwrapped

The cursor rolls past 1440 minutes without wrapping, so `formatMinutesAsClock` produces
`24:15`, `25:30`, and beyond. Arguably clearer than `00:15` for a continuous schedule, but
it was never specified and it will look like a bug to a secretary who hasn't been told.

## 8. LOW — the view switcher sits on one column but drives both

`scheduleViewMode` is shared state, so the regular/minimum/maximum toggle changes both the
predicted and live columns. The control renders only inside the predicted header, which
reads as though it applies to that column alone.

## 9. VERIFIED SAFE — the write path does not wipe judges or prizes

I flagged this as a data-loss risk; it isn't. `GetClassById` populates `JudgeIds` and
`Prizes` via `GetJudgeIdsByClassId` / `GetClassPrizesByClassId` after the main read
(`ClassInCompetitionDAL.cs:106-110`), and `ClassPrizeItem` round-trips symmetrically as
`{prizeTypeId, prizeAmount}`. Resending the full row preserves both.

## 10. VERIFY ON THE TEST COMPETITION — classDateTime timezone round-trip

`classDateTime` is `timestamp with time zone`. `applyStartTimeSuggestion` reads it and
resends it verbatim. A serialization round-trip through a different offset could shift a
class to the adjacent day, which would silently regroup the whole schedule. Needs one
before/after DB read on a real class to rule out.

## 11. Confirmed correct

- Per-day math, tied-first-class origin resolution, and the button targeting that day's
  first class all match the settled spec (`resolveDayOrigin:148-174`).
- `avg` = `(min+max)/2` = 6 for extreme, matching the confirmed flattening split.
- Tiers read live 23/24/25; suggestion fires only on orange/red; yellow is advisory text
  only, no button.
- All seven Hebrew strings appear verbatim.
- Schedule columns render first in the DOM, which is rightmost on an RTL page — correct,
  but worth one visual confirmation.
- Live column counts Active entries only, matching the system-wide convention.
- Schedule math runs over the full unfiltered class list, so search/filter never changes
  the computed times.

---

## Suggested order of work

1. Deploy proc 164 (unblocks everything).
2. Decide the assumed-start source, then implement #2.
3. Fix #4 gap scoping and #5 field coverage — both change the numbers.
4. Add #6 clamp text; decide #7 display.
5. Build #3 column groups last — pure presentation, no math risk.
6. Then end-to-end verification on the designated test competition, with DB reads for #10.
