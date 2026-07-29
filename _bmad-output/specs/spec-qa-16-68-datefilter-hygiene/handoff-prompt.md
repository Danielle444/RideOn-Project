# Implementation Handoff — Competition date filter (overlap) + backend log hygiene

Paste the block between the `---` separators into a fresh Claude Code session, in a clean checkout of the RideOn repo. It is fully self-contained: every proc body, file anchor, and verification step is embedded, so you do not need any file outside a normal `main` checkout. Retires QA **#16 ≡ #68**, **#34**, **#35**.

---

## Task: competition-board date filter → OVERLAP, plus remove pre-existing debug/log noise

### Who/what this is
RideOn is a Western-equestrian competition manager: ASP.NET Core 8 API (`RideOnServer`) over a Supabase/PostgreSQL DB (project `sxplumrexbolpwqacpiz`), React web + React Native mobile clients. All DB access goes through PostgreSQL **stored procedures** (functions, `prokind='f'`) called positionally from `DBServices.cs`. This task is **backend + one live stored procedure only** — no frontend.

### Load first
- Skills `ride-on-live-db-ops` and `ride-on-system-knowledge` — this touches a **live production** stored procedure and server code. Follow the live-DB write protocol in `ride-on-live-db-ops` exactly.
- If present in your checkout, the canonical contract is `_bmad-output/specs/spec-qa-16-68-datefilter-hygiene/` (`SPEC.md` + `datefilter-proc-change.md` + `backend-hygiene-removals.md`). This prompt embeds the same content, so it is fine if that folder is not on your branch yet.

### Prerequisites
- **Supabase MCP access** to project `sxplumrexbolpwqacpiz` (`execute_sql`, `apply_migration`). Reads are free. Part A applies a migration to the **live production** DB.
- **This is a production write.** Before applying the migration, show the exact SQL and get an explicit human go-ahead. If you are not authorized to write production directly, prepare and verify everything, then loop in Oren for the apply.
- `dotnet` SDK to build `RideOnServer`.

### FIRST: open a new branch
Create a feature branch off `main` before writing anything:
```
git checkout main
git pull
git checkout -b fix/qa-16-68-datefilter-hygiene
```
Note: a repo git-protection hook blocks `git checkout main` and any command containing `merge`. If `git checkout main` is blocked, branch from your current up-to-date `main` with `git checkout -b fix/qa-16-68-datefilter-hygiene` and confirm `git log --oneline -1` is the head of `main`. **Do not merge to `main`** — Oren does that.

Do the work as **two separate commits**: Part A (proc behaviour change) and Part B (log-noise cleanup) must not share a commit.

---

## Part A — Date filter: contained-within → OVERLAP (retires #16 no-results half ≡ #68)

### The bug (verified live 2026-07-29)
`usp_getcompetitionsbyhostranch` filters dates as **contained-within**:
```
AND (datefrom_param IS NULL OR c.competitionstartdate >= datefrom_param)
AND (dateto_param   IS NULL OR c.competitionenddate   <= dateto_param)
```
So a competition that straddles a window edge silently vanishes from the board. Proven live: a "Nov 5 → Nov 30" search on ranch 11 drops competition **14** "תחרות ריינינג 11+12 2025" (runs **2025-11-04 → 2025-11-08**) because it *starts* one day before the window. The "error banner" half of #16 is already fixed (the proc no longer throws on date params — confirmed live); only this no-results behaviour (= #68) remains.

### The fix (decision D1, locked)
OVERLAP semantics — a competition appears if it overlaps the window at all (`end >= from AND start <= to`):
```
AND (datefrom_param IS NULL OR c.competitionenddate   >= datefrom_param)
AND (dateto_param   IS NULL OR c.competitionstartdate <= dateto_param)
```

### CRITICAL — author the migration from the LIVE body, not the repo file
The repo file `RideOnDB/StoredProcedures/PostgreSQL/Individual/10_usp_GetCompetitionsByHostRanch.sql` is **stale**: it uses `p_*` param names and declares the string return columns as `TEXT`, while **live** uses `*_param` names and `character varying`. Applying the repo file as-is against live would fail `42P13` (cannot change return type). Author the migration from the live definition below, changing **only the two date WHERE lines**.

**Step 1 — read-only capture (rollback source).** Fetch and confirm the live body matches this (`SELECT pg_get_functiondef` on `usp_getcompetitionsbyhostranch`):
```sql
CREATE OR REPLACE FUNCTION public.usp_getcompetitionsbyhostranch(
    ranchid_param integer,
    searchtext_param text DEFAULT NULL::text,
    status_param text DEFAULT NULL::text,
    fieldid_param smallint DEFAULT NULL::smallint,
    datefrom_param date DEFAULT NULL::date,
    dateto_param date DEFAULT NULL::date)
 RETURNS TABLE("CompetitionId" integer, "HostRanchId" integer, "FieldId" smallint,
    "CreatedBySystemUserId" integer, "CompetitionName" character varying,
    "CompetitionStartDate" date, "CompetitionEndDate" date, "RegistrationOpenDate" date,
    "RegistrationEndDate" date, "PaidTimeRegistrationDate" date, "PaidTimePublicationDate" date,
    "CompetitionStatus" character varying, "Notes" character varying,
    "StallMapUrl" character varying, "FieldName" character varying)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        c.competitionid, c.hostranchid, c.fieldid, c.createdbysystemuserid,
        c.competitionname, c.competitionstartdate, c.competitionenddate,
        c.registrationopendate, c.registrationenddate, c.paidtimeregistrationdate,
        c.paidtimepublicationdate, c.competitionstatus, c.notes, c.stallmapurl, f.fieldname
    FROM competition c
    INNER JOIN field f ON c.fieldid = f.fieldid
    WHERE c.hostranchid = ranchid_param
      AND (searchtext_param IS NULL OR TRIM(searchtext_param) = '' OR c.competitionname ILIKE '%' || searchtext_param || '%')
      AND (status_param     IS NULL OR TRIM(status_param)     = '' OR c.competitionstatus = status_param)
      AND (fieldid_param    IS NULL OR c.fieldid = fieldid_param)
      AND (datefrom_param   IS NULL OR c.competitionstartdate >= datefrom_param)
      AND (dateto_param     IS NULL OR c.competitionenddate   <= dateto_param)
    ORDER BY c.competitionstartdate DESC;
END;
$function$
```
If live differs from this, STOP and reconcile — do not proceed on a stale assumption.

**Step 2 — show the exact new SQL and get go-ahead.** The migration is the block above with only the two date WHERE lines changed to the OVERLAP form:
```sql
      AND (datefrom_param   IS NULL OR c.competitionenddate   >= datefrom_param)
      AND (dateto_param     IS NULL OR c.competitionstartdate <= dateto_param)
```
(unchanged signature/return columns → plain `CREATE OR REPLACE`, no `DROP`, no `42P13`).

**Step 3 — apply** via `apply_migration`, name `datefilter_overlap_usp_getcompetitionsbyhostranch`.

**Step 4 — re-read as proof.** `pg_get_functiondef` again; confirm the two WHERE lines now read `c.competitionenddate >= datefrom_param` / `c.competitionstartdate <= dateto_param` and everything else is byte-identical to Step 1.

**Step 5 — live smoke test (this is the CAP-1 success criterion).**
```sql
SELECT "CompetitionId", "CompetitionName", "CompetitionStartDate", "CompetitionEndDate"
FROM usp_getcompetitionsbyhostranch(11, NULL, NULL, NULL, DATE '2025-11-05', DATE '2025-11-30')
WHERE "CompetitionId" = 14;
```
Expect **1 row** (comp 14, 2025-11-04..2025-11-08) after the change; it returned **0** before. Also sanity-check an unbounded call `usp_getcompetitionsbyhostranch(11, NULL, NULL, NULL, NULL, NULL)` returns the usual full set (NULL bounds unaffected).

**Step 6 — repo↔live sync (part of the same commit).**
- Add `RideOnDB/migrations/datefilter_overlap_usp_getcompetitionsbyhostranch.sql` containing the exact `CREATE OR REPLACE` you applied.
- Rewrite `RideOnDB/StoredProcedures/PostgreSQL/Individual/10_usp_GetCompetitionsByHostRanch.sql` to match the **deployed** body verbatim (capture via `pg_get_functiondef` after Step 3; normalize header/indentation to repo style). This also clears the pre-existing `p_*`/`TEXT` drift — do not leave the stale version. Leave `PG_02_Competition.sql` untouched (deprecated aggregate, not a source of truth).

### No C# change in Part A
`CompetitionDAL.GetCompetitionsByHostRanch` (`RideOnServer/DAL/CompetitionDAL.cs`) already calls through `CreateCommandWithStoredProcedure` with a positional 6-param dictionary in proc order and reads columns by name. The change is WHERE-only (signature/columns/order unchanged), so the deployed backend is unaffected and the proc deploys independently. **Commit Part A now** (migration file + rewritten proc file only).

---

## Part B — Backend hygiene (retires #34, #35) — SEPARATE commit

Line numbers below are as of 2026-07-29; re-anchor on the surrounding text.

### #34 (priority — log leak) — `RideOnServer/DAL/DBServices.cs`, method `Connect()`
Remove the four DB-topology prints (currently 24–27). They are pure diagnostics — nothing reads them, and the connection is built from `cStr`, not `builder`:
```csharp
            Console.WriteLine("=== DB HOST === " + builder.Host);
            Console.WriteLine("=== DB PORT === " + builder.Port);
            Console.WriteLine("=== DB USER === " + builder.Username);
            Console.WriteLine("=== DB DATABASE === " + builder.Database);
```
Also remove the now-unused local `var builder = new NpgsqlConnectionStringBuilder(cStr);` (it existed only to feed those prints), so no unused-variable warning is introduced. Keep `return new NpgsqlConnection(cStr);`.

### #35 (dead debug logging) — remove all `[ISSUE-C]` lines + the orphaned helper
`RideOnServer/Controllers/ClassesInCompetitionController.cs` — remove both `TEMP DEBUG (Issue C)` comment + `Console.WriteLine("[ISSUE-C] …")` blocks: in `CreateClassInCompetition` (currently 134–136) and `UpdateClassInCompetition` (currently 192–194). **Keep** the legitimate `catch` logs (`Console.WriteLine($"Error in …: {ex.Message}")`).

`RideOnServer/DAL/ClassInCompetitionDAL.cs` — in `SaveClassPrizes`, remove the `TEMP DEBUG` comment (line 323) and the four `[ISSUE-C]` `Console.WriteLine` lines (324–325, 328, 334, 351). Keep the real logic: `DeleteClassPrizeByClassId`, the loop, the incomplete-row guard `if (!prize.PrizeTypeId.HasValue || !prize.PrizeAmount.HasValue) { continue; }` (drop only its inner log), and the `usp_UpsertClassPrize` upsert. Then **remove the now-orphaned private helper `CountClassPrizes`** (currently 355–364, plus its `TEMP DEBUG` comment) — its only remaining callers are the `[ISSUE-C]` lines you just deleted (verify with a grep: after removal it should have zero references).

### Verify Part B
In `RideOnServer/`:
```
dotnet build
```
Expect 0 errors and the pre-existing ~171 nullable warnings (unrelated). Confirm the three touched files introduce **no new** warnings (esp. no unused-variable/unused-method). Then confirm these greps return nothing:
```
grep -rn "ISSUE-C" RideOnServer
grep -rn "CountClassPrizes" RideOnServer
grep -rn "=== DB HOST" RideOnServer
```
**Commit Part B** as its own commit.

---

## Definition of done
- New branch `fix/qa-16-68-datefilter-hygiene` off `main`; two commits (A: proc + repo sync; B: hygiene). Not merged to `main`.
- Live proc changed to OVERLAP, re-read as proof, comp-14 smoke test returns the row; repo migration + proc file reconciled to the deployed body.
- `#34`/`#35` prints gone, `CountClassPrizes` and unused `builder` gone, `dotnet build` clean of new warnings, greps empty.
- Report back: the two commit hashes, the migration name, the before/after smoke-test rows, and anything you had to reconcile (e.g. live body differing from the embedded one).

### Out of scope (do not touch)
- **#20** (classes-tab entry counts — a separate backend proc gap).
- **#52** (frontend change-tracking casing — Spec 2).
- All frontend / any other QA ticket. No `CompetitionsBoardPage.jsx` / `competitionService.js` change is needed.

---
