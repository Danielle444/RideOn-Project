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
