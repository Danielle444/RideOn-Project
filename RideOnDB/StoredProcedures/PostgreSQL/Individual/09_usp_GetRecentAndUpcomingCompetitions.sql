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
