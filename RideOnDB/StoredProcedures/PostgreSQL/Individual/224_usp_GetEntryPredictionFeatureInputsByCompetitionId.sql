-- ============================================================================
-- usp_getentrypredictionfeatureinputsbycompetitionid - batched, competition-
-- scoped sibling of usp_getentrypredictionfeatureinputs (repo file 160)
-- ============================================================================
-- NEW FUNCTION, 2026-08-04 (Prediction perf work, Option B / Phase 1).
-- ADDITIVE ONLY: does not replace, alter, or get called by
-- usp_getentrypredictionfeatureinputs(p_classincompid integer) -- that
-- function is untouched and keeps serving its existing single-class callers
-- (FeatureVectorBuilder.Build(classIncompId, ...) and the parity test
-- harness, RideOnServer.Tests/FeatureVectorBuilderParityTests.cs).
--
-- Purpose: PredictionService.RecomputeCompetition calls the single-class
-- function once per class in a competition (2N+2 DB round trips for an
-- N-class save). This function returns the identical row shape for every
-- class in one competitionid in a single call, so the C# integration (not
-- yet wired -- this file only adds the SP) can replace N per-class reads
-- with one batched read.
--
-- Derived directly from the live body of usp_getentrypredictionfeatureinputs
-- (pg_get_functiondef, verified 2026-08-04) with exactly three changes:
--   1. target's WHERE filters by competitionid instead of classincompid,
--      returning one row per class in the competition instead of one row.
--   2. fap/cap/prize_agg become GROUP BY-based lookup sets joined per target
--      row instead of per-call scalar subqueries -- completed_classes (the
--      full-history aggregation) is computed ONCE per statement instead of
--      once per class, which is the whole point of this function. The
--      AVG/SUM values themselves are unchanged: same rows, same filters,
--      same NULL-when-no-match behavior (a fieldname/classname with zero
--      completed_classes rows produces no group, so the LEFT JOIN
--      null-extends -- identical end result to the original's scalar
--      subquery over an empty set).
--   3. Added ORDER BY classincompid for deterministic output.
-- No filter, join condition, active-entry definition (entrystatus =
-- 'Active'), competition-status filter ('הסתיימה'), or prize-type mapping
-- was changed.
--
-- Live equivalence-verified 2026-08-04 against usp_getentrypredictionfeature
-- inputs called once per class, for competitions 78 (38 classes), 3 (57
-- classes), and 44 (1 class): zero missing/extra/duplicate rows, zero column
-- mismatches across all 15 columns, null-safe (IS DISTINCT FROM), no
-- rounding. Any future change to the feature set must update BOTH this
-- function and usp_getentrypredictionfeatureinputs to keep them aligned.
--
-- Read-only. Performs no INSERT/UPDATE/DELETE. Writes no entryprediction row.
-- ============================================================================

CREATE FUNCTION public.usp_getentrypredictionfeatureinputsbycompetitionid(p_competitionid integer)
 RETURNS TABLE(classincompid integer, competitionid integer, classdatetime timestamp with time zone,
               orderinday smallint, totalcost numeric, classtypeid smallint, classname text,
               fieldid smallint, fieldname text, classespercompetition integer,
               fieldavgpastentries numeric, classnameavgpastentries numeric,
               prizeshovaramount numeric, prizejackpotpostedamount numeric, prizeaddedmoneyamount numeric)
 LANGUAGE sql
AS $function$
    WITH target AS (
        SELECT
            cic.classincompid,
            cic.competitionid,
            cic.classdatetime,
            cic.orderinday,
            COALESCE(cic.organizercost, 0) + COALESCE(cic.federationcost, 0) AS totalcost,
            ct.classtypeid,
            ct.classname::text AS classname,
            f.fieldid,
            f.fieldname::text AS fieldname
        FROM classincompetition cic
        JOIN classtype ct ON ct.classtypeid = cic.classtypeid
        JOIN field     f  ON f.fieldid      = ct.fieldid
        WHERE cic.competitionid = p_competitionid
    ),
    cpc AS (
        SELECT COUNT(*)::integer AS classes_per_competition
        FROM classincompetition cic
        WHERE cic.competitionid = p_competitionid
    ),
    completed_classes AS (
        SELECT
            cic.classincompid,
            ct.classname::text AS classname,
            f.fieldname::text AS fieldname,
            COUNT(CASE WHEN e.entrystatus = 'Active' THEN 1 END) AS entrycount
        FROM classincompetition cic
        JOIN classtype   ct ON ct.classtypeid  = cic.classtypeid
        JOIN field       f  ON f.fieldid       = ct.fieldid
        JOIN competition c  ON c.competitionid = cic.competitionid
        LEFT JOIN entry  e  ON e.classincompid = cic.classincompid
        WHERE c.competitionstatus = 'הסתיימה'
        GROUP BY cic.classincompid, ct.classname, f.fieldname
    ),
    fap AS (
        SELECT fieldname, AVG(entrycount) AS field_avg_past_entries
        FROM completed_classes
        GROUP BY fieldname
    ),
    cap AS (
        SELECT classname, AVG(entrycount) AS classname_avg_past_entries
        FROM completed_classes
        GROUP BY classname
    ),
    prize_agg AS (
        SELECT
            cp.classincompid,
            SUM(CASE WHEN cp.prizetypeid = 1 THEN cp.prizeamount END) AS prize_shovar_amount,
            SUM(CASE WHEN cp.prizetypeid = 2 THEN cp.prizeamount END) AS prize_jackpot_posted_amount,
            SUM(CASE WHEN cp.prizetypeid = 3 THEN cp.prizeamount END) AS prize_added_money_amount
        FROM classprize cp
        JOIN target t ON t.classincompid = cp.classincompid
        GROUP BY cp.classincompid
    )
    SELECT
        t.classincompid,
        t.competitionid,
        t.classdatetime,
        t.orderinday,
        t.totalcost,
        t.classtypeid,
        t.classname,
        t.fieldid,
        t.fieldname,
        cpc.classes_per_competition,
        fap.field_avg_past_entries,
        cap.classname_avg_past_entries,
        COALESCE(pa.prize_shovar_amount, 0),
        COALESCE(pa.prize_jackpot_posted_amount, 0),
        COALESCE(pa.prize_added_money_amount, 0)
    FROM target t
    CROSS JOIN cpc
    LEFT JOIN fap ON fap.fieldname = t.fieldname
    LEFT JOIN cap ON cap.classname = t.classname
    LEFT JOIN prize_agg pa ON pa.classincompid = t.classincompid
    ORDER BY t.classincompid;
$function$;
