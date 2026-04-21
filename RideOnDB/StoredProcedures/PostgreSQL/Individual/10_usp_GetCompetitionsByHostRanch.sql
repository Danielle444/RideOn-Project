CREATE OR REPLACE FUNCTION usp_GetCompetitionsByHostRanch(
    p_RanchId    INTEGER,
    p_SearchText TEXT     DEFAULT NULL,
    p_Status     TEXT     DEFAULT NULL,
    p_FieldId    SMALLINT DEFAULT NULL,
    p_DateFrom   DATE     DEFAULT NULL,
    p_DateTo     DATE     DEFAULT NULL
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
    WHERE c.hostranchid = p_RanchId
      AND (p_SearchText IS NULL OR TRIM(p_SearchText) = '' OR c.competitionname ILIKE '%' || p_SearchText || '%')
      AND (p_Status     IS NULL OR TRIM(p_Status)     = '' OR c.competitionstatus = p_Status)
      AND (p_FieldId    IS NULL OR c.fieldid = p_FieldId)
      AND (p_DateFrom   IS NULL OR c.competitionstartdate >= p_DateFrom)
      AND (p_DateTo     IS NULL OR c.competitionenddate   <= p_DateTo)
    ORDER BY c.competitionstartdate DESC;
END;
$$;
