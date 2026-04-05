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
