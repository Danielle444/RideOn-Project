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
