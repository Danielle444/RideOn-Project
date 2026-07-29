---
id: SPEC-qa-16-68-datefilter-hygiene
companions:
  - datefilter-proc-change.md
  - backend-hygiene-removals.md
sources:
  - .claude/worktrees/secretary-qa-cleanup-b6ffc8/_bmad-output/specs/secretary-qa-cleanup/spec3-backend-datefilter-hygiene-handoff.md
  - .claude/worktrees/secretary-qa-cleanup-b6ffc8/_bmad-output/specs/secretary-qa-cleanup/triage-and-thread-summary.md
---

> **Canonical contract.** This SPEC and the files in `companions:` are the complete, preservation-validated contract for what to build, test, and validate. Source documents listed in frontmatter are for traceability only — consult them only if you need narrative rationale this contract intentionally omits.

# Competition-board date filter (overlap) + backend log-noise hygiene

## Why

A pain to solve, plus a security-flavoured cleanup. Two threads, three tickets, one small backend surface.

**Thread A (retires QA #16 ≡ #68) — a secretary loses real competitions from the board.** The competition-board date filter is `contained-within`: a competition only appears if it falls *entirely* inside the searched window. Any competition that straddles a window edge silently vanishes from the results, with no error and no hint that it was dropped. Verified live 2026-07-29: a "Nov 5 → Nov 30" search on ranch 11 drops competition 14 "תחרות ריינינג 11+12 2025" (runs 2025-11-04 → 11-08) purely because it *starts* one day before the window, even though it plainly happens during it. Oren's locked decision (D1) is overlap semantics: a competition appears if it overlaps the window at all. The "error banner" half of #16 is already resolved live (the proc no longer throws on date params) — only this no-results behaviour remains.

**Thread B (retires QA #34, #35) — pre-existing debug noise, one of it a log leak.** `DBServices.Connect()` prints the DB host, port, username, and database name on *every* connection, so Render's production logs leak the connection topology and DB username on every DB-touching request (#34, security-flavoured). Separately, leftover `[ISSUE-C]` `Console.WriteLine` lines from the (now-fixed) prize-upsert investigation still sit in the class controller and DAL (#35). Both are dead noise that should have gone when their investigations closed.

## Capabilities

- **CAP-1** — Date-filter overlap (retires #16 no-results half + #68)
  - **intent:** A secretary searching the competition board by date window sees every competition that overlaps that window, including ones that start before or end after it.
  - **success:** After the proc change is applied live, a "Nov 5 → Nov 30" (2025-11-05 → 2025-11-30) search on ranch 11 returns competition 14 "תחרות ריינינג 11+12 2025"; before the change it does not. Verified by re-running the ranch-11 overlap smoke query in `datefilter-proc-change.md` and by a re-read of `pg_get_functiondef` showing the two rewritten WHERE lines. No other filter (search text, status, field, ordering) or returned column changes behaviour.

- **CAP-2** — Remove DB-topology debug prints (retires #34)
  - **intent:** The server stops emitting DB host/port/username/database to logs on every connection.
  - **success:** The four `Console.WriteLine` lines in `DBServices.Connect()` (`RideOnServer/DAL/DBServices.cs`) are gone; `dotnet build` in `RideOnServer/` succeeds; a grep for `=== DB HOST`/`=== DB PORT`/`=== DB USER`/`=== DB DATABASE` returns nothing.

- **CAP-3** — Remove `[ISSUE-C]` debug lines + orphaned helper (retires #35)
  - **intent:** The leftover prize-upsert investigation logging is fully removed, leaving no dead code behind it.
  - **success:** The six `[ISSUE-C]` `Console.WriteLine` lines and their `TEMP DEBUG (Issue C)` comments are gone from `ClassesInCompetitionController.cs` and `ClassInCompetitionDAL.cs`; the now-unused private helper `CountClassPrizes` (its only remaining callers were those debug lines) is also removed; `dotnet build` succeeds; a grep for `ISSUE-C` and `CountClassPrizes` returns nothing.

## Constraints

- **Produce a SPEC only — do NOT implement.** This document is the contract; a downstream session executes it.
- **Verify against LIVE before specifying/applying any proc change.** The live proc body was captured 2026-07-29 (`datefilter-proc-change.md`); the migration is authored *from that live body*, not from the repo file. Every DB write is shown to Oren as exact SQL and confirmed before it runs, then re-read as proof.
- **CAP-1 is authored from the live functiondef, not the repo file.** The repo file `10_usp_GetCompetitionsByHostRanch.sql` is STALE — it differs from live in parameter names (`p_*` vs live `*_param`) *and* return-column types (`TEXT` vs live `character varying`). Applying the repo file as-is against live would fail `42P13` (cannot change return type). The migration changes ONLY the two date WHERE lines against the live body; the repo file is then rewritten to match the deployed result verbatim. See `datefilter-proc-change.md`.
- **CAP-1 stays backward-compatible and deploy-decoupled.** The change is WHERE-only: parameters, return columns, and ordering are untouched, so the deployed backend (`CompetitionDAL` reads columns by name via `CreateCommandWithStoredProcedure`, positional 6-param bind) needs no code change and no redeploy coupling. It can be applied to live independently.
- **Repo↔live sync is mandatory.** CAP-1 adds a migration file under `RideOnDB/migrations/` and rewrites the proc file under `RideOnDB/StoredProcedures/PostgreSQL/Individual/` so repo and live stay in sync (per the standing rule that a repo `.sql` is never evidence of what is deployed).
- **Commit Part A (CAP-1) separately from Part B (CAP-2 + CAP-3).** A proc behaviour change and a log-noise cleanup must not share a commit. Both land on one feature branch off `main`; no merge to `main` without Oren's approval.
- **Run `dotnet build` in `RideOnServer/` after the CAP-2/CAP-3 `.cs` edits.** Expect the pre-existing ~171 nullable warnings; confirm the touched files are warning-free rather than expecting a zero total.

## Non-goals

- **#20** (classes-tab entry counts) — a genuine separate backend proc-gap ticket (`usp_getclassesbycompetitionid` returns no entry columns); not part of this batch.
- **#52** (frontend change-tracking casing cleanup) — belongs to Spec 2.
- **All frontend work** (Specs 1 and 2). No `CompetitionsBoardPage.jsx` / `competitionService.js` change is needed for CAP-1 and none is in scope.
- **Touching the live parameter-type binding for `@DateFrom`/`@DateTo`** — existing, working behaviour; the overlap change does not affect it.
- **Dropping or renaming the stale repo params/return types beyond matching live** — the repo file is reconciled to the deployed body, nothing more.

## Success signal

A secretary date-searches the competition board and the results now include the straddling competitions that used to disappear — concretely, the ranch-11 "Nov 5 → Nov 30" search returns competition 14 where before it returned nothing for it — while Render's production logs stop printing the DB host/username on every request and the codebase carries no `[ISSUE-C]` or `=== DB HOST` lines. Demonstrable via the live overlap smoke query, a `pg_get_functiondef` re-read, and two greps that come back empty.

## Assumptions

- The competition-board frontend passes `dateFrom`/`dateTo` straight through unchanged (stated in the handoff and consistent with the positional DAL); CAP-1 therefore needs no frontend touch. If a downstream reader finds otherwise, that is a new open question, not a silent fix.

## Open Questions

_None open._ CAP-2 shape resolved 2026-07-29: **remove the four `Connect()` prints entirely** (plus the now-unused `builder` local). They are pure diagnostics — nothing reads them, the connection is built from `cStr` not `builder`, and there is no debug-flag convention in this codebase to gate them behind. A gated version would be dead machinery.
