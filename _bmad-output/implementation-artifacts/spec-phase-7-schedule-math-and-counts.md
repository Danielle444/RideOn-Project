---
title: 'Phase 7 — schedule math corrections and entry-count consistency'
type: 'bugfix'
created: '2026-07-21'
status: 'in-review'
review_loop_iteration: 0
baseline_commit: 'a02f838'
context:
  - '{project-root}/_bmad-output/brainstorming/brainstorm-phase-7-scheduling-view-2026-07-20/hebrew-strings.md'
  - '{project-root}/_bmad-output/brainstorming/brainstorm-phase-7-scheduling-view-2026-07-20/step1-gap-audit.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The shipped schedule view computes times from a wrong flattening model (the between-class gap is applied to every field instead of reining only, and the every-6-runs gap inside a class is missing entirely), silently clamps an insufficient start-time suggestion to 06:00 without saying so, and sits next to a כניסות column that counts cancelled entries while the schedule column counts only Active — so two adjacent columns on the same row disagree.

**Approach:** Correct the flattening model at its source (proc 164 returns gap values only for reining, plus a new interval key), extend class duration by the mid-class gaps, surface the insufficient-clamp case as advisory text, and narrow the כניסות count to Active entries.

## Boundaries & Constraints

**Always:**
- Hebrew strings render verbatim from `hebrew-strings.md`. New strings are added to that file in the same change that introduces them.
- The between-class gap never precedes a day's first class — current behaviour, preserve it.
- A flattening gap is never doubled where a run interval coincides with a class boundary.
- The mid-class gap uses the same `betweenclassgapminutes` duration (10) as the between-class gap — one concept, one duration.
- Schedule math runs over the full unfiltered class list; search/filter never changes computed times.
- SQL written here is a repo file plus a deployment request. Never assume it is live.

**Ask First:**
- Any live DB write — the proc 164 `DROP`/`CREATE` and the smartconfig insert. Show exact SQL, wait for approval.
- Naming a test competition for the timezone verification.
- Any change that would alter computed times for a field other than reining.

**Never:**
- Do not touch the רגיל/מינימום/מקסימום switcher semantics — the interval is fixed at 6, not switcher-linked.
- Do not implement day-splitting or class-moving. String C mentions them as advice only; both are behind this phase's scope fence.
- Do not restructure the table into column groups — deferred, see `deferred-work.md`.
- Do not filter `getEntriesForClass` itself — it backs the cancelled-entries toggle.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Reining, 12 entries, interval 6 | class of 12 runs | 1 mid-class gap (after run 6); run 12 is the class boundary, not doubled | N/A |
| Reining, 7 entries, interval 6 | class of 7 runs | 1 mid-class gap | N/A |
| Reining, 6 entries, interval 6 | class of 6 runs | 0 mid-class gaps — boundary coincides with class end | N/A |
| Cutting / extreme, any entries | non-reining field | 0 gaps anywhere; rolls forward continuously | N/A |
| Suggestion sufficient | finish 24:30, origin 08:00 | button offers 07:30, no advisory text | N/A |
| Suggestion insufficient | finish 26:10, origin 06:30 | button offers 06:00 **and** string C renders | N/A |
| Class with 2 cancelled of 12 | mixed entryStatus | כניסות shows 10, matching the schedule column | N/A |
| Config value absent | new smartconfig key missing | interval treated as 0 → no mid-class gaps, no crash | Degrade silently, existing `\|\| 0` idiom |

</frozen-after-approval>

## Code Map

- `RideOnDB/StoredProcedures/PostgreSQL/Individual/164_usp_GetScheduleConfigByFieldId.sql` -- returns schedule config per field; gains an 8th column and reining gating
- `RideOnServer/BL/DTOs/Schedule/ScheduleConfig.cs` -- DTO, gains `FlatteningRunsPerGap`
- `RideOnServer/DAL/ScheduleConfigDAL.cs` -- reads proc columns by name
- `RideOnClient/rideon-client/web/src/utils/classSchedule.utils.js` -- all schedule math; `computeDaySchedule` (~181), `EARLIEST_SUGGESTABLE_START_MINUTES` (177)
- `RideOnClient/rideon-client/web/src/components/secretary/classes/SecretaryClassesOverviewTable.jsx` -- `renderScheduleCell`, `renderApplyButton`
- `RideOnClient/rideon-client/web/src/hooks/secretary/useSecretaryCompetitionClassesPage.js` -- `getEntriesForClass` (624), `getEntriesCountForClass` (642), Active-filter idiom (1207-1213)
- `_bmad-output/brainstorming/.../hebrew-strings.md` -- string table, gains strings 8 and 9

## Tasks & Acceptance

**Execution:**
- [x] `164_usp_GetScheduleConfigByFieldId.sql` -- rewrite as `DROP FUNCTION` + `CREATE FUNCTION` adding `flatteningrunspergap numeric` last; gate `betweenclassgapminutes` and the new column to reining, returning NULL for every other field -- `CREATE OR REPLACE` cannot change a return type, and gating in SQL keeps field knowledge out of the frontend
- [x] `ScheduleConfig.cs` + `ScheduleConfigDAL.cs` -- add `FlatteningRunsPerGap`, read by column name -- mirrors the existing per-property pattern exactly
- [x] `classSchedule.utils.js` -- extend each class's duration by `floor((entries - 1) / interval) * gapMinutes` when both are > 0; add `isInsufficient` to the advance suggestion when the pre-clamp target falls below 06:00 -- both are pure-math changes in `computeDaySchedule`
- [x] `SecretaryClassesOverviewTable.jsx` -- render string C when `suggestion.isInsufficient`; change the set-button label to string 8 -- presentation only
- [x] `useSecretaryCompetitionClassesPage.js` -- filter `getEntriesCountForClass` to Active, leaving `getEntriesForClass` untouched -- narrowest fix that makes the two columns agree without breaking the cancelled toggle
- [x] `hebrew-strings.md` -- record strings 8 and 9 verbatim -- the file claims to be the complete verbatim set and is currently missing the shipped string 8
- [x] `classSchedule.utils.test.js` -- unit-test the I/O matrix rows -- the gap arithmetic has four boundary cases that are easy to get off by one
- [x] `package.json` -- add vitest as a devDependency and a `test` script -- NOT anticipated by this spec: the web app had zero test infrastructure, approved by Oren mid-implementation. This is the repo's first frontend test.

**Acceptance Criteria:**
- Given a non-reining competition, when the schedule renders, then computed times are identical to a continuous roll-forward with no gaps at all.
- Given the new smartconfig key is absent from live, when the page loads, then the schedule still renders and no error surfaces to the secretary.
- Given `dotnet build` runs after the `.cs` changes, then 0 errors and the two touched files are warning-free (total stays ~171 pre-existing).
- Given a class with cancelled entries, when the page renders, then כניסות and the live schedule column derive from the same number.

## Design Notes

**Why the reining gate lives in the proc, not the frontend.** `scheduleConfig` is already fetched per `fieldId`, so the DB is the natural place to answer "does this field flatten?". Gating there means `classSchedule.utils.js` needs no field knowledge and no new branch — the existing `|| 0` fallback turns a NULL gap into no gap automatically, so the between-class half of finding 4 is fixed with zero frontend code.

The cost is a magic `p_fieldid = 1` in the proc. The cleaner long-term shape is per-field columns on `fieldconfig` (where `minutesperentrymin/max` already live), which would make the exemption declarative instead of hardcoded. Out of scope here; worth flagging at review.

**Mid-class gap formula.** `floor((entries - 1) / interval)` yields the never-doubled rule for free: 12 entries at interval 6 gives 1, not 2, because the boundary at run 12 is the class end where the between-class gap already falls.

**Deliberate non-change.** `getHasDrawForClass` also calls `getEntriesForClass` and will keep seeing cancelled entries. Arguably it should be Active-only too, but that changes draw-order behaviour, which is outside this spec. Flagging, not fixing.

## Verification

**Commands:**
- `cd RideOnServer && dotnet build` -- expected: 0 errors; `ScheduleConfig.cs` and `ScheduleConfigDAL.cs` warning-free
- `cd RideOnClient/rideon-client/web && npm run lint` -- expected: no new findings in touched files

**Manual checks:**
- Live DB, after Oren deploys: call the proc across all six fieldids; expect gap columns non-NULL for fieldid 1 only, NULL for 2/3/4/5/6.
- Finding 10 (timezone): on a named test competition, read `classdatetime` for one class, apply a start-time suggestion, re-read. Expect the date component unchanged. A shift to the adjacent day is a failure and blocks the increment.

## Suggested Review Order

**The flattening model — start here**

- Entry point: the whole gap model in two small functions; `- 1` is the never-doubled rule.
  [`classSchedule.utils.js:189`](../../RideOnClient/rideon-client/web/src/utils/classSchedule.utils.js#L189)

- Reining gating lives in SQL, so the client needs no field knowledge at all.
  [`164_usp_GetScheduleConfigByFieldId.sql:45`](../../RideOnDB/StoredProcedures/PostgreSQL/Individual/164_usp_GetScheduleConfigByFieldId.sql#L45)

- DROP is mandatory: an 8th return column cannot ship via CREATE OR REPLACE.
  [`164_usp_GetScheduleConfigByFieldId.sql:26`](../../RideOnDB/StoredProcedures/PostgreSQL/Individual/164_usp_GetScheduleConfigByFieldId.sql#L26)

- Config read; null gap columns coerce to 0, which is what disables gaps off-reining.
  [`classSchedule.utils.js:216`](../../RideOnClient/rideon-client/web/src/utils/classSchedule.utils.js#L216)

**Insufficient-suggestion text**

- Pre-clamp target is kept so the 06:00 floor becomes detectable rather than silent.
  [`classSchedule.utils.js:324`](../../RideOnClient/rideon-client/web/src/utils/classSchedule.utils.js#L324)

- Renders string 9 alongside, not instead of, the existing advance button.
  [`SecretaryClassesOverviewTable.jsx:207`](../../RideOnClient/rideon-client/web/src/components/secretary/classes/SecretaryClassesOverviewTable.jsx#L207)

**Deploy-order tolerance — added mid-session after a live regression**

- Absent column now yields null; previously threw past the NpgsqlException catch and killed the feature silently.
  [`ScheduleConfigDAL.cs:59`](../../RideOnServer/DAL/ScheduleConfigDAL.cs#L59)

**Entry-count consistency (QA 41)**

- Filter sits on the count, not the shared getter, so the cancelled toggle survives.
  [`useSecretaryCompetitionClassesPage.js:648`](../../RideOnClient/rideon-client/web/src/hooks/secretary/useSecretaryCompetitionClassesPage.js#L648)

**Peripherals**

- String 8 label, approved 2026-07-21.
  [`SecretaryClassesOverviewTable.jsx:185`](../../RideOnClient/rideon-client/web/src/components/secretary/classes/SecretaryClassesOverviewTable.jsx#L185)

- 11 tests pinning every I/O matrix row; the repo's first frontend tests.
  [`classSchedule.utils.test.js:1`](../../RideOnClient/rideon-client/web/src/utils/classSchedule.utils.test.js#L1)
