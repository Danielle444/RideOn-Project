CREATE OR REPLACE FUNCTION usp_InsertCompetition(
    p_HostRanchId               INTEGER,
    p_FieldId                   SMALLINT,
    p_CreatedBySystemUserId     INTEGER,
    p_CompetitionName           TEXT,
    p_CompetitionStartDate      DATE,
    p_CompetitionEndDate        DATE,
    p_RegistrationOpenDate      DATE    DEFAULT NULL,
    p_RegistrationEndDate       DATE    DEFAULT NULL,
    p_PaidTimeRegistrationDate  DATE    DEFAULT NULL,
    p_PaidTimePublicationDate   DATE    DEFAULT NULL,
    p_CompetitionStatus         TEXT    DEFAULT 'Draft',
    p_Notes                     TEXT    DEFAULT NULL
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
        p_HostRanchId, p_FieldId, p_CreatedBySystemUserId, p_CompetitionName,
        p_CompetitionStartDate, p_CompetitionEndDate,
        p_RegistrationOpenDate, p_RegistrationEndDate,
        p_PaidTimeRegistrationDate, p_PaidTimePublicationDate,
        p_CompetitionStatus, p_Notes, NULL
    )
    RETURNING competitionid INTO v_new_id;

    RETURN QUERY SELECT v_new_id AS "NewCompetitionId";
END;
$$;
