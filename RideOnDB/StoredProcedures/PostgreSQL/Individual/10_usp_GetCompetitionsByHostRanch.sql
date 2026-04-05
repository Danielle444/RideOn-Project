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
