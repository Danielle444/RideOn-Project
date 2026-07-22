# Handoff prompt — Phase 7 implementation

Paste everything below the line into the new session.

---

Phase 7 of the RideOn Smart Element work: the scheduling view on the secretary classes page.
Scoping and a full gap audit are already done — do not re-scope, and do not re-investigate what
the audit already settled.

**Read these first, in this order:**

1. `.claude/skills/ride-on-system-knowledge/SKILL.md` — domain context
2. `_bmad-output/brainstorming/brainstorm-phase-7-scheduling-view-2026-07-20/step1-gap-audit.md`
   — what is built vs. what was decided, findings numbered 1-11
3. `_bmad-output/brainstorming/brainstorm-phase-7-scheduling-view-2026-07-20/.memlog.md`
   — the full decision chronology
4. `_bmad-output/brainstorming/brainstorm-phase-7-scheduling-view-2026-07-20/hebrew-strings.md`
   — the seven final Hebrew strings, verbatim, do not paraphrase

## State of play

Phase 7 was already substantially implemented in commit `9d6119a "schedule start"` on branch
`feature/schedule-view` — 12 files, 914 insertions. It is NOT greenfield. The audit found the
feature was dead because its stored procedure had never been deployed; that is now fixed.

Already applied and verified live (Supabase project `sxplumrexbolpwqacpiz`):

- `usp_getscheduleconfigbyfieldid` deployed, 7 return columns, verified across all six fieldids
- `smartconfig.defaultfirstclassstarthour = 8` inserted
- `betweenclassgapminutes` and `flatteningguidance` descriptions corrected to reining-only
- repo file `164_usp_GetScheduleConfigByFieldId.sql` synced to the deployed definition (uncommitted)

Closed by the audit, do not revisit: findings 5, 7, 9, 11.

## Remaining work, in this order

1. **Assumed start time (audit finding 2).** Wire `defaultfirstclassstarthour` through
   `ScheduleConfig.cs` → `ScheduleConfigDAL.cs` → `classSchedule.utils.js`. Replace the
   durations-only fallback in `computeDaySchedule` (the `origin.startMinutes === null` branch)
   with a rolled-forward timeline originating at 08:00, keeping the existing nudge (Hebrew
   string 4) visible. The shipped behaviour is the option Oren explicitly rejected.

2. **Flattening gap (audit finding 4).** Currently `betweenClassGapMinutes` is applied between
   every pair of classes on every field. Correct model, confirmed 2026-07-20 and superseding the
   older all-fields note: **reining only**; within reining a gap falls both between each class
   **and** every 5-7 runs; never doubled where a class boundary coincides with the run interval.
   OPEN DECISION for Oren: does 5/6/7 track the existing רגיל/מינימום/מקסימום switcher
   (5 runs = more gaps = מקסימום, 7 = fewer = מינימום, 6 = רגיל), or stay fixed at 6?
   Ask before implementing.

3. **Insufficient-suggestion text (audit finding 6).** `classSchedule.utils.js:251` clamps the
   suggested start to 06:00 silently. When the clamp means the suggestion no longer resolves the
   overage, say so explicitly. Hebrew wording needs Oren's approval.

4. **Expandable column groups (audit finding 3).** Entirely unbuilt. Restructure
   `SecretaryClassesOverviewTable.jsx` into three collapsible groups — arena + judges,
   financial (prices/prizes), schedule — because the table is now 16 columns wide. Largest item;
   pure presentation, no schedule-math risk.

5. **Verify finding 10.** `classDateTime` is `timestamptz` and `applyStartTimeSuggestion` reads
   then resends it verbatim. Confirm with before/after DB reads on the test competition that a
   timezone round-trip cannot shift a class to the adjacent day.

Also still open from the original scoping: log the parked future feature (secretary sets
per-class minutes-per-entry generally, not only for extreme) to the QA tracker in the standard
bug-creation JSON format. Latest tracker issue is 39; items 37-39 are parked/blocked and
unrelated — do not pick them up.

## Working rules

- Show diffs before applying. Investigate before writing code on anything nontrivial, and mark
  explicitly what was read vs. inferred.
- After any `.cs` change run `dotnet build` in `RideOnServer/`, then grep for call paths that
  bypass the changed logic.
- Live DB access is available via the Supabase MCP (project `sxplumrexbolpwqacpiz`). Reads are
  free; **confirm every write with Oren before running it**, showing the exact SQL.
- Stored-proc params bind POSITIONALLY (`@p1, @p2…`) — dictionary entry order must match the
  proc's parameter order. Key names only affect type resolution in `AddParameterWithType`.
- `CREATE OR REPLACE` cannot change a return type; adding another column to proc 164 needs an
  explicit `DROP FUNCTION` first.
- A git hook blocks checkout to main and any command containing "merge". Merges are Oren's own
  hands. Branch is `feature/schedule-view`.
- Nothing from this work is committed yet.
