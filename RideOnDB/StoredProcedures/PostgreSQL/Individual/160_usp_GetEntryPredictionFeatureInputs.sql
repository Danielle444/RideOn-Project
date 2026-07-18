-- Feature inputs for the entry-count prediction model, one row for a single classincompid.
-- Design decisions locked in during review (see feature/prediction-feature-builder):
--   * ClassesPerCompetition counts ALL classincompetition rows for the target's competitionid,
--     regardless of competition status (a not-yet-completed competition must still get a count).
--   * FieldAvgPastEntries / ClassNameAvgPastEntries are computed over ALL completed-competition
--     classes (competitionstatus = 'הסתיימה') with NO self-exclusion of the target row. This
--     exactly reproduces Smart_Element/01_data_prep.ipynb's training-time aggregation, so
--     re-scoring one of the 965 historical training rows must reproduce parity_reference_v1.csv
--     byte-for-byte. Both are returned nullable (no COALESCE) — the fallback
--     (classname avg -> field avg) and the hard-refusal when field avg is NULL both live in
--     FeatureVectorBuilder (C#) so they stay unit-testable without a DB connection.
--   * Prize amounts are matched by prizetypeid (1=שובר, 2=ג'קפוט, 3=כסף מוסף), never by
--     ILIKE'ing prizetypename. classprize.prizeamount is NOT NULL and PK is
--     (classincompid, prizetypeid), so at most one row per type — SUM(CASE...) is safe and
--     collapses to plain COALESCE-to-0 semantics.
CREATE OR REPLACE FUNCTION usp_GetEntryPredictionFeatureInputs(p_classincompid integer)
RETURNS TABLE (
    ClassInCompId            integer,
    CompetitionId            integer,
    ClassDateTime            timestamptz,
    OrderInDay               smallint,
    TotalCost                numeric,
    ClassTypeId              smallint,
    ClassName                text,
    FieldId                  smallint,
    FieldName                text,
    ClassesPerCompetition    integer,
    FieldAvgPastEntries      numeric,
    ClassNameAvgPastEntries  numeric,
    PrizeShovarAmount        numeric,
    PrizeJackpotPostedAmount numeric,
    PrizeAddedMoneyAmount    numeric
)
LANGUAGE sql
AS $$
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
        WHERE cic.classincompid = p_classincompid
    ),
    cpc AS (
        SELECT COUNT(*)::integer AS classes_per_competition
        FROM classincompetition cic
        WHERE cic.competitionid = (SELECT competitionid FROM target)
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
        SELECT AVG(entrycount) AS field_avg_past_entries
        FROM completed_classes
        WHERE fieldname = (SELECT fieldname FROM target)
    ),
    cap AS (
        SELECT AVG(entrycount) AS classname_avg_past_entries
        FROM completed_classes
        WHERE classname = (SELECT classname FROM target)
    ),
    prize_agg AS (
        SELECT
            SUM(CASE WHEN cp.prizetypeid = 1 THEN cp.prizeamount END) AS prize_shovar_amount,
            SUM(CASE WHEN cp.prizetypeid = 2 THEN cp.prizeamount END) AS prize_jackpot_posted_amount,
            SUM(CASE WHEN cp.prizetypeid = 3 THEN cp.prizeamount END) AS prize_added_money_amount
        FROM classprize cp
        WHERE cp.classincompid = p_classincompid
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
    LEFT JOIN fap ON true
    LEFT JOIN cap ON true
    LEFT JOIN prize_agg pa ON true;
$$;
