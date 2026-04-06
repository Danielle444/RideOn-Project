CREATE OR REPLACE FUNCTION usp_GetJudgesByCompetitionId(
    p_CompetitionId INTEGER
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
    WHERE cic.competitionid = p_CompetitionId;
END;
$$;
