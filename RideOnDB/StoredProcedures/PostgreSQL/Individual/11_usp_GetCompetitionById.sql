CREATE OR REPLACE FUNCTION usp_GetCompetitionById(
    p_CompetitionId INTEGER
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
    WHERE c.competitionid = p_CompetitionId;
END;
$$;
