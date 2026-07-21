# Handoff — Phase 7, next session

Paste everything below the line into the new session.

---

Phase 7 of the RideOn Smart Element: the scheduling view on the secretary classes page.
Scoping and the gap audit are long done. The schedule-math increment is implemented but
NOT finished — three things are outstanding and one of them is a quality gate that never ran.

**Read first, in this order:**

1. `.claude/skills/ride-on-system-knowledge/SKILL.md` — domain context, DB rules, working conventions
2. `_bmad-output/implementation-artifacts/spec-phase-7-schedule-math-and-counts.md` — the spec,
   status `in-review`, with a Suggested Review Order at the end
3. `_bmad-output/brainstorming/brainstorm-phase-7-scheduling-view-2026-07-20/hebrew-strings.md`
   — nine strings now, verbatim, never paraphrased

## What shipped this session

Branch `feature/schedule-view`, baseline commit `a02f838`. Six files changed plus one new
test file. Verified: `dotnet build` 0 errors / 172 warnings (branch baseline, unchanged),
`npm test` 11/11, `npm run lint` no errors in touched files.

- **Flattening (audit finding 4)** — gap is now reining-only, gated in proc 164 rather than
  the frontend, plus a mid-class gap every 6 runs via `floor((entries - 1) / 6)`.
- **Insufficient clamp (finding 6)** — `isInsufficient` on the advance suggestion, rendering
  Hebrew string 9.
- **String 8** — set-button label is now `הכנס את שעת ההתחלה HH:MM`.
- **QA 41** — `getEntriesCountForClass` filters to Active; `getEntriesForClass` deliberately
  untouched because the cancelled show/hide/only toggle depends on it.
- **Deploy-order tolerance** — `ScheduleConfigDAL` now checks the reader's schema per column.
  Added mid-session after the DAL reading a not-yet-deployed column silently killed the whole
  feature on Oren's local run. Do not undo this.
- **Vitest** — the repo's first frontend test infrastructure, 11 tests on the gap arithmetic.

## Outstanding — in priority order

1. ~~**Two live DB writes.**~~ **DONE 2026-07-21.** Both applied and verified live.
   - `smartconfig.flatteningrunspergap = 6` inserted (`updatedat 2026-07-21 15:25:14+00`).
   - proc 164 redeployed with 8 columns via migration
     `schedule_config_add_flattening_runs_per_gap` (DROP + CREATE in one migration).
   - Verified by calling the proc across all six fieldids: gap and runs are non-NULL for
     fieldid 1 (ריינינג) ONLY — 10 and 6 — and NULL for 2/3/4/5/6. Ungated values
     (`defaultfirstclassstarthour=8`, tiers 23/24/25) unchanged for every field.
   - The repo file already matches the deployed definition character for character.

   The flattening fix is therefore LIVE. Note the deployed proc changes behaviour for the
   currently deployed production backend immediately — cutting and extreme stopped getting
   gaps at that moment, which is the intended fix but landed ahead of any code deploy.

2. **The adversarial review gate never ran.** Step 4 of the quick-dev workflow wants Blind
   Hunter and Edge Case Hunter run in parallel on the diff since `a02f838`, with no prior
   context. Oren was asked twice and did not rule on it. The spec is deliberately left at
   status `in-review` rather than `done` so this is not silently skipped. The gap arithmetic
   is the highest-risk part of the change and has never been reviewed by anything but its
   own author.

3. **Audit finding 10 — timezone round-trip, unverified and now looking LIKELY.**
   Test competition is **id 7, "ריינינג 1+2"** (reining, 38 classes, starts 2026-04-29).

   Baseline captured 2026-07-21, read-only, full precision: every class on the first day is
   stored at exactly `2026-04-29 00:00:00+00` — **midnight UTC**. That is the worst-case
   position for a round-trip bug, because the shift is asymmetric:
   - UTC → Asia/Jerusalem = `2026-04-29 03:00` — same date, harmless
   - local `00:00` → UTC = `2026-04-28 21:00` — **date shifts backward one day**

   So any layer that interprets the stored timestamp as local wall-clock before writing it
   back moves every class to 2026-04-28, and `groupClassesByDay` (which keys on
   `classDateTime.substring(0,10)`) silently regroups the entire schedule.

   Verify: `SELECT classincompid, classdatetime::text FROM classincompetition WHERE
   competitionid = 7 ORDER BY classincompid;` → apply a start-time suggestion in the UI →
   re-read → diff. Reference row: classincompid 136, `פתוח לא מוגבל`, orderinday 1,
   starttime `09:00:00`, 3 active entries — it is the day's origin class and therefore the
   one the suggestion button writes to.

   Note also that orderinday has ties on this competition (137/138 both 2, 142/143 both 6),
   so it exercises the tied-first-class origin resolution too.

## Deferred, do not pick up without asking

See `_bmad-output/implementation-artifacts/deferred-work.md`. Currently: the three
collapsible column groups (audit finding 3, the large item), the parked per-class
minutes-per-entry feature, and the prediction backfill-on-open proposal.

Two QA tracker entries were drafted as JSON but **not yet filed** — the prediction backfill
and the per-class minutes-per-entry feature. The canonical bug-creation JSON schema is not
in the repo; the drafts use field names reverse-engineered from how issue 41 renders. Get
the real schema from Oren and record it in the skill.

## Working rules

- Show diffs before applying. Investigate before writing code; mark what was read vs inferred.
- After any `.cs` change: `dotnet build` in `RideOnServer/`, then grep for call paths that
  bypass the changed logic. Baseline is 0 errors / 172 warnings on this branch (171 was the
  pre-Phase-7 figure) — check your touched files are warning-free, don't chase the total.
- Live DB writes: confirm every one with Oren, showing exact SQL, before running it.
- Stored-proc params bind POSITIONALLY. `CREATE OR REPLACE` cannot change a return type.
- `.claude/launch.json` exists but its `server` entry cannot start a working backend — the
  DB and JWT config live in OS env vars from Oren's out-of-repo `rideon-local.ps1`. Use
  `preview_start` for `web` only; Oren starts the backend himself. Web must stay on 5173.
- Git hook blocks checkout to main and any command containing "merge". Merges are Oren's own
  hands. Branch is `feature/schedule-view`.
