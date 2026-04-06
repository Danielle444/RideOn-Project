-- ============================================================
-- FILE 2: COMPETITION & CLASSES MODULE (PostgreSQL / Supabase)
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Get recent and upcoming competitions (payer view)
DROP FUNCTION IF EXISTS usp_GetRecentAndUpcomingCompetitions CASCADE;
CREATE OR REPLACE FUNCTION usp_GetRecentAndUpcomingCompetitions(
    status_param TEXT DEFAULT NULL
)
RETURNS TABLE(
    "CompetitionId"             INTEGER,
    "HostRanchId"               INTEGER,
    "FieldId"                   SMALLINT,
    "CreatedBySystemUserId"     INTEGER,
    "CompetitionName"           VARCHAR,
    "CompetitionStartDate"      DATE,
    "CompetitionEndDate"        DATE,
    "RegistrationOpenDate"      DATE,
    "RegistrationEndDate"       DATE,
    "PaidTimeRegistrationDate"  DATE,
    "PaidTimePublicationDate"   DATE,
    "CompetitionStatus"         VARCHAR,
    "Notes"                     VARCHAR,
    "StallMapUrl"               VARCHAR,
    "FieldName"                 VARCHAR
)
LANGUAGE plpgsql AS $$
DECLARE
    v_today        DATE := CURRENT_DATE;
    v_six_ago      DATE := CURRENT_DATE - INTERVAL '6 months';
    v_one_year     DATE := CURRENT_DATE + INTERVAL '1 year';
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
    WHERE c.competitionstartdate >= v_six_ago
      AND c.competitionstartdate <= v_one_year
      AND (status_param IS NULL OR c.competitionstatus = status_param)
    ORDER BY c.competitionstartdate ASC;
END;
$$;


-- 2. Get competitions by host ranch (secretary view with filters)
DROP FUNCTION IF EXISTS usp_GetCompetitionsByHostRanch CASCADE;
CREATE OR REPLACE FUNCTION usp_GetCompetitionsByHostRanch(
    ranchid_param    INTEGER,
    searchtext_param TEXT    DEFAULT NULL,
    status_param     TEXT    DEFAULT NULL,
    fieldid_param    SMALLINT DEFAULT NULL,
    datefrom_param   DATE    DEFAULT NULL,
    dateto_param     DATE    DEFAULT NULL
)
RETURNS TABLE(
    "CompetitionId"             INTEGER,
    "HostRanchId"               INTEGER,
    "FieldId"                   SMALLINT,
    "CreatedBySystemUserId"     INTEGER,
    "CompetitionName"           VARCHAR,
    "CompetitionStartDate"      DATE,
    "CompetitionEndDate"        DATE,
    "RegistrationOpenDate"      DATE,
    "RegistrationEndDate"       DATE,
    "PaidTimeRegistrationDate"  DATE,
    "PaidTimePublicationDate"   DATE,
    "CompetitionStatus"         VARCHAR,
    "Notes"                     VARCHAR,
    "StallMapUrl"               VARCHAR,
    "FieldName"                 VARCHAR
)
LANGUAGE plpgsql AS $$
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
      AND (datefrom_param   IS NULL OR c.competitionstartdate >= datefrom_param)
      AND (dateto_param     IS NULL OR c.competitionenddate   <= dateto_param)
    ORDER BY c.competitionstartdate DESC;
END;
$$;


-- 3. Get competition by ID
DROP FUNCTION IF EXISTS usp_GetCompetitionById CASCADE;
CREATE OR REPLACE FUNCTION usp_GetCompetitionById(
    competitionid_param INTEGER
)
RETURNS TABLE(
    "CompetitionId"             INTEGER,
    "HostRanchId"               INTEGER,
    "FieldId"                   SMALLINT,
    "CreatedBySystemUserId"     INTEGER,
    "CompetitionName"           VARCHAR,
    "CompetitionStartDate"      DATE,
    "CompetitionEndDate"        DATE,
    "RegistrationOpenDate"      DATE,
    "RegistrationEndDate"       DATE,
    "PaidTimeRegistrationDate"  DATE,
    "PaidTimePublicationDate"   DATE,
    "CompetitionStatus"         VARCHAR,
    "Notes"                     VARCHAR,
    "StallMapUrl"               VARCHAR,
    "FieldName"                 VARCHAR
)
LANGUAGE plpgsql AS $$
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
    WHERE c.competitionid = competitionid_param;
END;
$$;


-- 4. Insert new competition
DROP FUNCTION IF EXISTS usp_InsertCompetition CASCADE;
CREATE OR REPLACE FUNCTION usp_InsertCompetition(
    hostranchid_param               INTEGER,
    fieldid_param                   SMALLINT,
    createdbysystemuserid_param     INTEGER,
    competitionname_param           TEXT,
    competitionstartdate_param      DATE,
    competitionenddate_param        DATE,
    registrationopendate_param      DATE    DEFAULT NULL,
    registrationenddate_param       DATE    DEFAULT NULL,
    paidtimeregistrationdate_param  DATE    DEFAULT NULL,
    paidtimepublicationdate_param   DATE    DEFAULT NULL,
    competitionstatus_param         TEXT    DEFAULT 'Draft',
    notes_param                     TEXT    DEFAULT NULL
)
RETURNS TABLE("NewCompetitionId" INTEGER)
LANGUAGE plpgsql AS $$
DECLARE
    v_new_id INTEGER;
BEGIN
    INSERT INTO competition (
        hostranchid, fieldid, createdbysystemuserid, competitionname,
        competitionstartdate, competitionenddate,
        registrationopendate, registrationenddate,
        paidtimeregistrationdate, paidtimepublicationdate,
        competitionstatus, notes, stallmapurl
    )
    VALUES (
        hostranchid_param, fieldid_param, createdbysystemuserid_param, competitionname_param,
        competitionstartdate_param, competitionenddate_param,
        registrationopendate_param, registrationenddate_param,
        paidtimeregistrationdate_param, paidtimepublicationdate_param,
        competitionstatus_param, notes_param, NULL
    )
    RETURNING competitionid INTO v_new_id;

    RETURN QUERY SELECT v_new_id AS "NewCompetitionId";
END;
$$;


-- 5. Update competition
DROP FUNCTION IF EXISTS usp_UpdateCompetition CASCADE;
CREATE OR REPLACE FUNCTION usp_UpdateCompetition(
    competitionid_param             INTEGER,
    fieldid_param                   SMALLINT,
    competitionname_param           TEXT,
    competitionstartdate_param      DATE,
    competitionenddate_param        DATE,
    registrationopendate_param      DATE    DEFAULT NULL,
    registrationenddate_param       DATE    DEFAULT NULL,
    paidtimeregistrationdate_param  DATE    DEFAULT NULL,
    paidtimepublicationdate_param   DATE    DEFAULT NULL,
    competitionstatus_param         TEXT    DEFAULT NULL,
    notes_param                     TEXT    DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE competition SET
        fieldid                   = fieldid_param,
        competitionname           = competitionname_param,
        competitionstartdate      = competitionstartdate_param,
        competitionenddate        = competitionenddate_param,
        registrationopendate      = registrationopendate_param,
        registrationenddate       = registrationenddate_param,
        paidtimeregistrationdate  = paidtimeregistrationdate_param,
        paidtimepublicationdate   = paidtimepublicationdate_param,
        competitionstatus         = competitionstatus_param,
        notes                     = notes_param
    WHERE competitionid = competitionid_param;
END;
$$;


-- 6. Get classes from the latest competition in a field (for duplication)
DROP FUNCTION IF EXISTS usp_GetClassesFromLatestCompetition CASCADE;
CREATE OR REPLACE FUNCTION usp_GetClassesFromLatestCompetition(
    fieldid_param SMALLINT
)
RETURNS TABLE(
    "ClassInCompId"         INTEGER,
    "ClassTypeId"           SMALLINT,
    "ClassName"             VARCHAR,
    "CompetitionId"         INTEGER,
    "CompetitionName"       VARCHAR,
    "CompetitionStartDate"  DATE,
    "OrganizerCost"         NUMERIC(10,2),
    "FederationCost"        NUMERIC(10,2)
)
LANGUAGE plpgsql AS $$
DECLARE
    v_latest_comp_id INTEGER;
BEGIN
    SELECT c.competitionid INTO v_latest_comp_id
    FROM competition c
    WHERE c.fieldid = fieldid_param
    ORDER BY c.competitionstartdate DESC
    LIMIT 1;

    IF v_latest_comp_id IS NOT NULL THEN
        RETURN QUERY
        SELECT
            cic.classincompid,
            cic.classtypeid,
            ct.classname,
            c.competitionid,
            c.competitionname,
            c.competitionstartdate,
            cic.organizercost,
            cic.federationcost
        FROM classincompetition cic
        INNER JOIN competition c  ON cic.competitionid = c.competitionid
        INNER JOIN classtype   ct ON cic.classtypeid   = ct.classtypeid
        WHERE cic.competitionid = v_latest_comp_id
        ORDER BY cic.orderinday ASC;
    END IF;
END;
$$;


-- 7. Get competitions by field in last two years (for duplication dropdown)
DROP FUNCTION IF EXISTS usp_GetCompetitionsByFieldLastTwoYears CASCADE;
CREATE OR REPLACE FUNCTION usp_GetCompetitionsByFieldLastTwoYears(
    fieldid_param SMALLINT
)
RETURNS TABLE("CompetitionId" INTEGER, "CompetitionName" VARCHAR)
LANGUAGE plpgsql AS $$
DECLARE
    v_two_years_ago DATE := CURRENT_DATE - INTERVAL '2 years';
BEGIN
    RETURN QUERY
    SELECT c.competitionid, c.competitionname
    FROM competition c
    WHERE c.fieldid = fieldid_param
      AND c.competitionstartdate >= v_two_years_ago
    ORDER BY c.competitionstartdate DESC;
END;
$$;


-- 8. Get classes by competition ID
DROP FUNCTION IF EXISTS usp_GetClassesByCompetitionId CASCADE;
CREATE OR REPLACE FUNCTION usp_GetClassesByCompetitionId(
    competitionid_param INTEGER
)
RETURNS TABLE(
    "ClassInCompId"  INTEGER,
    "ClassTypeId"    SMALLINT,
    "ClassName"      VARCHAR,
    "ArenaRanchId"   INTEGER,
    "ArenaId"        SMALLINT,
    "ArenaName"      VARCHAR,
    "ClassDateTime"  TIMESTAMP,
    "OrganizerCost"  NUMERIC(10,2),
    "FederationCost" NUMERIC(10,2),
    "StartTime"      TIME,
    "OrderInDay"     SMALLINT,
    "ClassNotes"     VARCHAR
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT
        cic.classincompid,
        cic.classtypeid,
        ct.classname,
        cic.arenaranchid,
        cic.arenaid,
        a.arenaname,
        cic.classdatetime,
        cic.organizercost,
        cic.federationcost,
        cic.starttime,
        cic.orderinday,
        cic.classnotes
    FROM classincompetition cic
    INNER JOIN classtype ct ON cic.classtypeid  = ct.classtypeid
    INNER JOIN arena     a  ON cic.arenaranchid = a.ranchid AND cic.arenaid = a.arenaid
    WHERE cic.competitionid = competitionid_param
    ORDER BY cic.classdatetime ASC, cic.orderinday ASC, cic.classincompid ASC;
END;
$$;


-- 9. Insert class in competition
DROP FUNCTION IF EXISTS usp_InsertClassInCompetition CASCADE;
CREATE OR REPLACE FUNCTION usp_InsertClassInCompetition(
    competitionid_param  INTEGER,
    classtypeid_param    SMALLINT,
    arenaranchid_param   INTEGER,
    arenaid_param        SMALLINT,
    classdatetime_param  TIMESTAMP  DEFAULT NULL,
    starttime_param      TIME       DEFAULT NULL,
    orderinday_param     SMALLINT   DEFAULT NULL,
    organizercost_param  NUMERIC(10,2) DEFAULT NULL,
    federationcost_param NUMERIC(10,2) DEFAULT NULL,
    classnotes_param     TEXT       DEFAULT NULL
)
RETURNS TABLE("NewClassInCompId" INTEGER)
LANGUAGE plpgsql AS $$
DECLARE
    v_new_id INTEGER;
BEGIN
    INSERT INTO classincompetition (
        competitionid, classtypeid, arenaranchid, arenaid,
        classdatetime, starttime, orderinday,
        organizercost, federationcost, classnotes
    )
    VALUES (
        competitionid_param, classtypeid_param, arenaranchid_param, arenaid_param,
        classdatetime_param, starttime_param, orderinday_param,
        organizercost_param, federationcost_param, classnotes_param
    )
    RETURNING classincompid INTO v_new_id;

    RETURN QUERY SELECT v_new_id AS "NewClassInCompId";
END;
$$;


-- 10. Update class in competition
DROP FUNCTION IF EXISTS usp_UpdateClassInCompetition CASCADE;
CREATE OR REPLACE FUNCTION usp_UpdateClassInCompetition(
    classincompid_param  INTEGER,
    classtypeid_param    SMALLINT,
    arenaranchid_param   INTEGER,
    arenaid_param        SMALLINT,
    classdatetime_param  TIMESTAMP  DEFAULT NULL,
    starttime_param      TIME       DEFAULT NULL,
    orderinday_param     SMALLINT   DEFAULT NULL,
    organizercost_param  NUMERIC(10,2) DEFAULT NULL,
    federationcost_param NUMERIC(10,2) DEFAULT NULL,
    classnotes_param     TEXT       DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE classincompetition SET
        classtypeid    = classtypeid_param,
        arenaranchid   = arenaranchid_param,
        arenaid        = arenaid_param,
        classdatetime  = classdatetime_param,
        starttime      = starttime_param,
        orderinday     = orderinday_param,
        organizercost  = organizercost_param,
        federationcost = federationcost_param,
        classnotes     = classnotes_param
    WHERE classincompid = classincompid_param;
END;
$$;


-- 11. Delete class in competition (with validation)
DROP FUNCTION IF EXISTS usp_DeleteClassInCompetition CASCADE;
CREATE OR REPLACE FUNCTION usp_DeleteClassInCompetition(
    classincompid_param INTEGER
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM entry WHERE classincompid = classincompid_param) THEN
        RAISE EXCEPTION 'Cannot delete class: There are registered entries.';
    END IF;

    DELETE FROM classprize WHERE classincompid = classincompid_param;
    DELETE FROM classjudge  WHERE classincompid = classincompid_param;
    DELETE FROM classincompetition WHERE classincompid = classincompid_param;
END;
$$;


-- 12. Get all class types (optionally filtered by field)
DROP FUNCTION IF EXISTS usp_GetAllClassTypes CASCADE;
CREATE OR REPLACE FUNCTION usp_GetAllClassTypes(
    fieldid_param SMALLINT DEFAULT NULL
)
RETURNS TABLE(
    "ClassTypeId"              SMALLINT,
    "FieldId"                  SMALLINT,
    "FieldName"                VARCHAR,
    "ClassName"                VARCHAR,
    "QualificationDescription" VARCHAR,
    "JudgingSheetFormat"       VARCHAR
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT
        ct.classtypeid,
        ct.fieldid,
        f.fieldname,
        ct.classname,
        ct.qualificationdescription,
        ct.judgingsheetformat
    FROM classtype ct
    INNER JOIN field f ON ct.fieldid = f.fieldid
    WHERE (fieldid_param IS NULL OR ct.fieldid = fieldid_param)
    ORDER BY f.fieldname ASC, ct.classname ASC;
END;
$$;


-- 13. Get all prize types
DROP FUNCTION IF EXISTS usp_GetAllPrizeTypes CASCADE;
CREATE OR REPLACE FUNCTION usp_GetAllPrizeTypes()
RETURNS TABLE(
    "PrizeTypeId"   SMALLINT,
    "PrizeTypeName" VARCHAR,
    "PrizeDescription" VARCHAR
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT pt.prizetypeid, pt.prizetypename, pt.prizedescription
    FROM prizetype pt
    ORDER BY pt.prizetypename ASC;
END;
$$;


-- 14. Get judges by class ID
DROP FUNCTION IF EXISTS usp_GetJudgesByClassId CASCADE;
CREATE OR REPLACE FUNCTION usp_GetJudgesByClassId(
    classincompid_param INTEGER
)
RETURNS TABLE(
    "JudgeId"          INTEGER,
    "FirstNameHebrew"  VARCHAR,
    "LastNameHebrew"   VARCHAR,
    "FirstNameEnglish" VARCHAR,
    "LastNameEnglish"  VARCHAR,
    "Country"          VARCHAR
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT
        j.judgeid,
        j.firstnamehebrew,
        j.lastnamehebrew,
        j.firstnameenglish,
        j.lastnameenglish,
        j.country
    FROM judge j
    INNER JOIN classjudge cj ON j.judgeid = cj.judgeid
    WHERE cj.classincompid = classincompid_param;
END;
$$;


-- 15. Get judges by competition ID
DROP FUNCTION IF EXISTS usp_GetJudgesByCompetitionId CASCADE;
CREATE OR REPLACE FUNCTION usp_GetJudgesByCompetitionId(
    competitionid_param INTEGER
)
RETURNS TABLE(
    "JudgeId"          INTEGER,
    "FirstNameHebrew"  VARCHAR,
    "LastNameHebrew"   VARCHAR,
    "FirstNameEnglish" VARCHAR,
    "LastNameEnglish"  VARCHAR,
    "Country"          VARCHAR
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        j.judgeid,
        j.firstnamehebrew,
        j.lastnamehebrew,
        j.firstnameenglish,
        j.lastnameenglish,
        j.country
    FROM judge j
    INNER JOIN classjudge       cj  ON j.judgeid       = cj.judgeid
    INNER JOIN classincompetition cic ON cj.classincompid = cic.classincompid
    WHERE cic.competitionid = competitionid_param;
END;
$$;
