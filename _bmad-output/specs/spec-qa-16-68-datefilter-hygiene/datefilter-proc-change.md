# CAP-1 — `usp_getcompetitionsbyhostranch` overlap change (proc reference)

Companion to `SPEC.md`. Holds the exact live proc body, the exact new body, the live-verify plan, and the repo↔live sync plan. Everything here was read against LIVE Supabase (`sxplumrexbolpwqacpiz`) on 2026-07-29 — not inferred from repo.

## 1. Current LIVE body (captured via `pg_get_functiondef`, 2026-07-29)

Live parameter names are `*_param`; the string return columns are `character varying` (NOT `TEXT`). Only the last two WHERE lines change.

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
        c.competitionid,
        c.hostranchid,
        c.fieldid,
        c.createdbysystemuserid,
        c.competitionname,
        c.competitionstartdate,
        c.competitionenddate,
        c.registrationopendate,
        c.registrationenddate,
        c.paidtimeregistrationdate,
        c.paidtimepublicationdate,
        c.competitionstatus,
        c.notes,
        c.stallmapurl,
        f.fieldname
    FROM competition c
    INNER JOIN field f ON c.fieldid = f.fieldid
    WHERE c.hostranchid = ranchid_param
      AND (searchtext_param IS NULL OR TRIM(searchtext_param) = '' OR c.competitionname ILIKE '%' || searchtext_param || '%')
      AND (status_param     IS NULL OR TRIM(status_param)     = '' OR c.competitionstatus = status_param)
      AND (fieldid_param    IS NULL OR c.fieldid = fieldid_param)
      AND (datefrom_param   IS NULL OR c.competitionstartdate >= datefrom_param)   -- contained-within (BUG)
      AND (dateto_param     IS NULL OR c.competitionenddate   <= dateto_param)     -- contained-within (BUG)
    ORDER BY c.competitionstartdate DESC;
END;
$function$
```

## 2. Exact new body to apply (overlap — the ONLY change is the two WHERE lines)

Swap which endpoint each bound compares against: a competition overlaps `[from, to]` iff `end >= from AND start <= to`. A NULL bound stays open on that side.

```sql
      AND (datefrom_param   IS NULL OR c.competitionenddate   >= datefrom_param)   -- overlap
      AND (dateto_param     IS NULL OR c.competitionstartdate <= dateto_param)     -- overlap
```

Full `CREATE OR REPLACE` to show Oren and apply — identical to §1 except those two lines:

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
        c.competitionid,
        c.hostranchid,
        c.fieldid,
        c.createdbysystemuserid,
        c.competitionname,
        c.competitionstartdate,
        c.competitionenddate,
        c.registrationopendate,
        c.registrationenddate,
        c.paidtimeregistrationdate,
        c.paidtimepublicationdate,
        c.competitionstatus,
        c.notes,
        c.stallmapurl,
        f.fieldname
    FROM competition c
    INNER JOIN field f ON c.fieldid = f.fieldid
    WHERE c.hostranchid = ranchid_param
      AND (searchtext_param IS NULL OR TRIM(searchtext_param) = '' OR c.competitionname ILIKE '%' || searchtext_param || '%')
      AND (status_param     IS NULL OR TRIM(status_param)     = '' OR c.competitionstatus = status_param)
      AND (fieldid_param    IS NULL OR c.fieldid = fieldid_param)
      AND (datefrom_param   IS NULL OR c.competitionenddate   >= datefrom_param)
      AND (dateto_param     IS NULL OR c.competitionstartdate <= dateto_param)
    ORDER BY c.competitionstartdate DESC;
END;
$function$
```

Because this is `CREATE OR REPLACE` with an unchanged signature and unchanged return columns, it does not need a `DROP` and does not trip `42P13`.

## 3. Live-verify plan (do these against live, in order)

1. **Read-only capture (already done 2026-07-29).** `pg_get_functiondef` of `usp_getcompetitionsbyhostranch` — matches §1. Keep this as the rollback source.
2. **Show Oren the exact §2 `CREATE OR REPLACE` SQL and get explicit go-ahead** before applying.
3. **Apply via `apply_migration`**, migration name e.g. `datefilter_overlap_usp_getcompetitionsbyhostranch`, one logical change.
4. **Re-read `pg_get_functiondef`** and confirm the two WHERE lines now read `c.competitionenddate >= datefrom_param` and `c.competitionstartdate <= dateto_param`, everything else byte-identical to §1.
5. **Overlap smoke query — proves CAP-1 success.** Run against live and confirm `contained_within_match=false, overlap_match=true` for comp 14, i.e. the deployed proc now returns it:

```sql
-- Direct proof the deployed proc returns the straddling competition for a Nov5->30 window
SELECT "CompetitionId", "CompetitionName", "CompetitionStartDate", "CompetitionEndDate"
FROM usp_getcompetitionsbyhostranch(11, NULL, NULL, NULL, DATE '2025-11-05', DATE '2025-11-30')
WHERE "CompetitionId" = 14;
-- BEFORE change: 0 rows. AFTER change: 1 row (תחרות ריינינג 11+12 2025, 2025-11-04..2025-11-08).
```

Baseline established 2026-07-29 (raw predicate check, ranch 11):

| competitionid | name | start | end | contained_within | overlap |
|---|---|---|---|---|---|
| 14 | תחרות ריינינג 11+12 2025 | 2025-11-04 | 2025-11-08 | false | true |

6. **Regression sanity:** confirm an unbounded call (`usp_getcompetitionsbyhostranch(11, NULL, NULL, NULL, NULL, NULL)`) returns the same rows as before (NULL bounds unaffected), and that a window that already contained a competition still returns it (overlap is a superset of contained-within).

## 4. Repo↔live sync plan (repo file is STALE — treat carefully)

The repo file `RideOnDB/StoredProcedures/PostgreSQL/Individual/10_usp_GetCompetitionsByHostRanch.sql` does NOT match live:

| | Repo file 10 | Live |
|---|---|---|
| Param names | `p_RanchId, p_SearchText, p_Status, p_FieldId, p_DateFrom, p_DateTo` | `ranchid_param, searchtext_param, status_param, fieldid_param, datefrom_param, dateto_param` |
| String return cols | `TEXT` | `character varying` |
| Date WHERE | contained-within | contained-within (same bug) |

Consequences and plan:
- **Do not derive the migration from the repo file.** Author it from the live body (§2). Running repo file 10 as-is against live would fail `42P13` (return type `TEXT` ≠ live `character varying`).
- **Add a migration file** under `RideOnDB/migrations/` (e.g. `datefilter_overlap_usp_getcompetitionsbyhostranch.sql`) containing exactly the §2 `CREATE OR REPLACE`.
- **Rewrite repo file 10** to match the deployed result verbatim: capture `pg_get_functiondef` after step 3, normalize header/indentation to repo style, and replace the file body so repo and live agree (character-for-character modulo CRLF/header normalization, per the standing reconciliation rule). This also fixes the pre-existing param-name and `TEXT`/`varchar` drift as a side effect — do not leave the stale version in place.
- `PG_02_Competition.sql` also contains a copy of this proc; like `PG_01_Auth.sql` it is a deprecated aggregate and is NOT a source of truth — leave it untouched (note only).

## 5. Why no C# change (CAP-1)

`CompetitionDAL.GetCompetitionsByHostRanch` (`RideOnServer/DAL/CompetitionDAL.cs:12`) calls through `CreateCommandWithStoredProcedure("usp_GetCompetitionsByHostRanch", …)` with a 6-entry positional dictionary (`@RanchId, @SearchText, @Status, @FieldId, @DateFrom, @DateTo`) in proc-parameter order, and reads results by column name via `MapCompetition(reader)`. The overlap change is WHERE-only — signature, return columns, and order are unchanged — so the deployed backend is unaffected and the proc change deploys independently of any code. (`@DateFrom`/`@DateTo` type binding is existing working behaviour; the proc "no longer throws on date params" was already confirmed live.)
