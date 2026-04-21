CREATE OR REPLACE FUNCTION usp_UpdateCompetition(
    p_CompetitionId             INTEGER,
    p_FieldId                   SMALLINT,
    p_CompetitionName           TEXT,
    p_CompetitionStartDate      DATE,
    p_CompetitionEndDate        DATE,
    p_RegistrationOpenDate      DATE    DEFAULT NULL,
    p_RegistrationEndDate       DATE    DEFAULT NULL,
    p_PaidTimeRegistrationDate  DATE    DEFAULT NULL,
    p_PaidTimePublicationDate   DATE    DEFAULT NULL,
    p_CompetitionStatus         TEXT    DEFAULT NULL,
    p_Notes                     TEXT    DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE competition SET
        fieldid                   = p_FieldId,
        competitionname           = p_CompetitionName,
        competitionstartdate      = p_CompetitionStartDate,
        competitionenddate        = p_CompetitionEndDate,
        registrationopendate      = p_RegistrationOpenDate,
        registrationenddate       = p_RegistrationEndDate,
        paidtimeregistrationdate  = p_PaidTimeRegistrationDate,
        paidtimepublicationdate   = p_PaidTimePublicationDate,
        competitionstatus         = p_CompetitionStatus,
        notes                     = p_Notes
    WHERE competitionid = p_CompetitionId;
END;
$$;
