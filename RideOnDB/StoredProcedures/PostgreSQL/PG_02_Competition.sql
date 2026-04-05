-- ============================================================
-- FILE 2: COMPETITION & CLASSES MODULE (PostgreSQL / Supabase)
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Get recent and upcoming competitions (payer view)
CREATE OR REPLACE FUNCTION usp_GetRecentAndUpcomingCompetitions(
    "Status" TEXT DEFAULT NULL
)
RETURNS TABLE(
    "CompetitionId"             INTEGER,
    "HostRanchId"               INTEGER,
    "FieldId"                   SMALLINT,
    "CreatedBySystemUserId"     INTEGER,
    "CompetitionName"           TEXT,
    "CompetitionStartDate"      DATE,
    "CompetitionEndDate"        DATE,
    "RegistrationOpenDate"      DATE,
    "RegistrationEndDate"       DATE,
    "PaidTimeRegistrationDate"  DATE,
    "PaidTimePublicationDate"   DATE,
    "CompetitionStatus"         TEXT,
    "Notes"                     TEXT,
    "StallMapUrl"               TEXT,
    "FieldName"                 TEXT
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
      AND ("Status" IS NULL OR c.competitionstatus = "Status")
    ORDER BY c.competitionstartdate ASC;
END;
$$;


-- 2. Get competitions by host ranch (secretary view with filters)
CREATE OR REPLACE FUNCTION usp_GetCompetitionsByHostRanch(
    "RanchId"    INTEGER,
    "SearchText" TEXT    DEFAULT NULL,
    "Status"     TEXT    DEFAULT NULL,
    "FieldId"    SMALLINT DEFAULT NULL,
    "DateFrom"   DATE    DEFAULT NULL,
    "DateTo"     DATE    DEFAULT NULL
)
RETURNS TABLE(
    "CompetitionId"             INTEGER,
    "HostRanchId"               INTEGER,
    "FieldId"                   SMALLINT,
    "CreatedBySystemUserId"     INTEGER,
    "CompetitionName"           TEXT,
    "CompetitionStartDate"      DATE,
    "CompetitionEndDate"        DATE,
    "RegistrationOpenDate"      DATE,
    "RegistrationEndDate"       DATE,
    "PaidTimeRegistrationDate"  DATE,
    "PaidTimePublicationDate"   DATE,
    "CompetitionStatus"         TEXT,
    "Notes"                     TEXT,
    "StallMapUrl"               TEXT,
    "FieldName"                 TEXT
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
    WHERE c.hostranchid = "RanchId"
      AND ("SearchText" IS NULL OR TRIM("SearchText") = '' OR c.competitionname ILIKE '%' || "SearchText" || '%')
      AND ("Status"     IS NULL OR TRIM("Status")     = '' OR c.competitionstatus = "Status")
      AND ("FieldId"    IS NULL OR c.fieldid = "FieldId")
      AND ("DateFrom"   IS NULL OR c.competitionstartdate >= "DateFrom")
      AND ("DateTo"     IS NULL OR c.competitionenddate   <= "DateTo")
    ORDER BY c.competitionstartdate DESC;
END;
$$;


-- 3. Get competition by ID
CREATE OR REPLACE FUNCTION usp_GetCompetitionById(
    "CompetitionId" INTEGER
)
RETURNS TABLE(
    "CompetitionId"             INTEGER,
    "HostRanchId"               INTEGER,
    "FieldId"                   SMALLINT,
    "CreatedBySystemUserId"     INTEGER,
    "CompetitionName"           TEXT,
    "CompetitionStartDate"      DATE,
    "CompetitionEndDate"        DATE,
    "RegistrationOpenDate"      DATE,
    "RegistrationEndDate"       DATE,
    "PaidTimeRegistrationDate"  DATE,
    "PaidTimePublicationDate"   DATE,
    "CompetitionStatus"         TEXT,
    "Notes"                     TEXT,
    "StallMapUrl"               TEXT,
    "FieldName"                 TEXT
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
    WHERE c.competitionid = "CompetitionId";
END;
$$;


-- 4. Insert new competition
CREATE OR REPLACE FUNCTION usp_InsertCompetition(
    "HostRanchId"               INTEGER,
    "FieldId"                   SMALLINT,
    "CreatedBySystemUserId"     INTEGER,
    "CompetitionName"           TEXT,
    "CompetitionStartDate"      DATE,
    "CompetitionEndDate"        DATE,
    "RegistrationOpenDate"      DATE    DEFAULT NULL,
    "RegistrationEndDate"       DATE    DEFAULT NULL,
    "PaidTimeRegistrationDate"  DATE    DEFAULT NULL,
    "PaidTimePublicationDate"   DATE    DEFAULT NULL,
    "CompetitionStatus"         TEXT    DEFAULT 'Draft',
    "Notes"                     TEXT    DEFAULT NULL
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
        "HostRanchId", "FieldId", "CreatedBySystemUserId", "CompetitionName",
        "CompetitionStartDate", "CompetitionEndDate",
        "RegistrationOpenDate", "RegistrationEndDate",
        "PaidTimeRegistrationDate", "PaidTimePublicationDate",
        "CompetitionStatus", "Notes", NULL
    )
    RETURNING competitionid INTO v_new_id;

    RETURN QUERY SELECT v_new_id AS "NewCompetitionId";
END;
$$;


-- 5. Update competition
CREATE OR REPLACE FUNCTION usp_UpdateCompetition(
    "CompetitionId"             INTEGER,
    "FieldId"                   SMALLINT,
    "CompetitionName"           TEXT,
    "CompetitionStartDate"      DATE,
    "CompetitionEndDate"        DATE,
    "RegistrationOpenDate"      DATE    DEFAULT NULL,
    "RegistrationEndDate"       DATE    DEFAULT NULL,
    "PaidTimeRegistrationDate"  DATE    DEFAULT NULL,
    "PaidTimePublicationDate"   DATE    DEFAULT NULL,
    "CompetitionStatus"         TEXT    DEFAULT NULL,
    "Notes"                     TEXT    DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE competition SET
        fieldid                   = "FieldId",
        competitionname           = "CompetitionName",
        competitionstartdate      = "CompetitionStartDate",
        competitionenddate        = "CompetitionEndDate",
        registrationopendate      = "RegistrationOpenDate",
        registrationenddate       = "RegistrationEndDate",
        paidtimeregistrationdate  = "PaidTimeRegistrationDate",
        paidtimepublicationdate   = "PaidTimePublicationDate",
        competitionstatus         = "CompetitionStatus",
        notes                     = "Notes"
    WHERE competitionid = "CompetitionId";
END;
$$;


-- 6. Get classes from the latest competition in a field (for duplication)
CREATE OR REPLACE FUNCTION usp_GetClassesFromLatestCompetition(
    "FieldId" SMALLINT
)
RETURNS TABLE(
    "ClassInCompId"         INTEGER,
    "ClassTypeId"           SMALLINT,
    "ClassName"             TEXT,
    "CompetitionId"         INTEGER,
    "CompetitionName"       TEXT,
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
    WHERE c.fieldid = "FieldId"
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
CREATE OR REPLACE FUNCTION usp_GetCompetitionsByFieldLastTwoYears(
    "FieldId" SMALLINT
)
RETURNS TABLE("CompetitionId" INTEGER, "CompetitionName" TEXT)
LANGUAGE plpgsql AS $$
DECLARE
    v_two_years_ago DATE := CURRENT_DATE - INTERVAL '2 years';
BEGIN
    RETURN QUERY
    SELECT c.competitionid, c.competitionname
    FROM competition c
    WHERE c.fieldid = "FieldId"
      AND c.competitionstartdate >= v_two_years_ago
    ORDER BY c.competitionstartdate DESC;
END;
$$;


-- 8. Get classes by competition ID
CREATE OR REPLACE FUNCTION usp_GetClassesByCompetitionId(
    "CompetitionId" INTEGER
)
RETURNS TABLE(
    "ClassInCompId"  INTEGER,
    "ClassTypeId"    SMALLINT,
    "ClassName"      TEXT,
    "ArenaRanchId"   INTEGER,
    "ArenaId"        SMALLINT,
    "ArenaName"      TEXT,
    "ClassDateTime"  TIMESTAMP,
    "OrganizerCost"  NUMERIC(10,2),
    "FederationCost" NUMERIC(10,2),
    "StartTime"      TIME,
    "OrderInDay"     SMALLINT,
    "ClassNotes"     TEXT
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
    WHERE cic.competitionid = "CompetitionId"
    ORDER BY cic.classdatetime ASC, cic.orderinday ASC, cic.classincompid ASC;
END;
$$;


-- 9. Insert class in competition
CREATE OR REPLACE FUNCTION usp_InsertClassInCompetition(
    "CompetitionId"  INTEGER,
    "ClassTypeId"    SMALLINT,
    "ArenaRanchId"   INTEGER,
    "ArenaId"        SMALLINT,
    "ClassDateTime"  TIMESTAMP  DEFAULT NULL,
    "StartTime"      TIME       DEFAULT NULL,
    "OrderInDay"     SMALLINT   DEFAULT NULL,
    "OrganizerCost"  NUMERIC(10,2) DEFAULT NULL,
    "FederationCost" NUMERIC(10,2) DEFAULT NULL,
    "ClassNotes"     TEXT       DEFAULT NULL
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
        "CompetitionId", "ClassTypeId", "ArenaRanchId", "ArenaId",
        "ClassDateTime", "StartTime", "OrderInDay",
        "OrganizerCost", "FederationCost", "ClassNotes"
    )
    RETURNING classincompid INTO v_new_id;

    RETURN QUERY SELECT v_new_id AS "NewClassInCompId";
END;
$$;


-- 10. Update class in competition
CREATE OR REPLACE FUNCTION usp_UpdateClassInCompetition(
    "ClassInCompId"  INTEGER,
    "ClassTypeId"    SMALLINT,
    "ArenaRanchId"   INTEGER,
    "ArenaId"        SMALLINT,
    "ClassDateTime"  TIMESTAMP  DEFAULT NULL,
    "StartTime"      TIME       DEFAULT NULL,
    "OrderInDay"     SMALLINT   DEFAULT NULL,
    "OrganizerCost"  NUMERIC(10,2) DEFAULT NULL,
    "FederationCost" NUMERIC(10,2) DEFAULT NULL,
    "ClassNotes"     TEXT       DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE classincompetition SET
        classtypeid    = "ClassTypeId",
        arenaranchid   = "ArenaRanchId",
        arenaid        = "ArenaId",
        classdatetime  = "ClassDateTime",
        starttime      = "StartTime",
        orderinday     = "OrderInDay",
        organizercost  = "OrganizerCost",
        federationcost = "FederationCost",
        classnotes     = "ClassNotes"
    WHERE classincompid = "ClassInCompId";
END;
$$;


-- 11. Delete class in competition (with validation)
CREATE OR REPLACE FUNCTION usp_DeleteClassInCompetition(
    "ClassInCompId" INTEGER
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM entry WHERE classincompid = "ClassInCompId") THEN
        RAISE EXCEPTION 'Cannot delete class: There are registered entries.';
    END IF;

    DELETE FROM classprize WHERE classincompid = "ClassInCompId";
    DELETE FROM classjudge  WHERE classincompid = "ClassInCompId";
    DELETE FROM classincompetition WHERE classincompid = "ClassInCompId";
END;
$$;


-- 12. Get all class types (optionally filtered by field)
CREATE OR REPLACE FUNCTION usp_GetAllClassTypes(
    "FieldId" SMALLINT DEFAULT NULL
)
RETURNS TABLE(
    "ClassTypeId"              SMALLINT,
    "FieldId"                  SMALLINT,
    "FieldName"                TEXT,
    "ClassName"                TEXT,
    "QualificationDescription" TEXT,
    "JudgingSheetFormat"       TEXT
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
    WHERE ("FieldId" IS NULL OR ct.fieldid = "FieldId")
    ORDER BY f.fieldname ASC, ct.classname ASC;
END;
$$;


-- 13. Get all prize types
CREATE OR REPLACE FUNCTION usp_GetAllPrizeTypes()
RETURNS TABLE(
    "PrizeTypeId"   SMALLINT,
    "PrizeTypeName" TEXT,
    "PrizeDescription" TEXT
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
CREATE OR REPLACE FUNCTION usp_GetJudgesByClassId(
    "ClassInCompId" INTEGER
)
RETURNS TABLE(
    "JudgeId"          INTEGER,
    "FirstNameHebrew"  TEXT,
    "LastNameHebrew"   TEXT,
    "FirstNameEnglish" TEXT,
    "LastNameEnglish"  TEXT,
    "Country"          TEXT
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
    WHERE cj.classincompid = "ClassInCompId";
END;
$$;


-- 15. Get judges by competition ID
CREATE OR REPLACE FUNCTION usp_GetJudgesByCompetitionId(
    "CompetitionId" INTEGER
)
RETURNS TABLE(
    "JudgeId"          INTEGER,
    "FirstNameHebrew"  TEXT,
    "LastNameHebrew"   TEXT,
    "FirstNameEnglish" TEXT,
    "LastNameEnglish"  TEXT,
    "Country"          TEXT
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
    WHERE cic.competitionid = "CompetitionId";
END;
$$;
