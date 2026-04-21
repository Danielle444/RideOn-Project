CREATE OR REPLACE FUNCTION usp_GetAllJudges(
    p_FieldId SMALLINT DEFAULT NULL
)
RETURNS TABLE(
    "JudgeId"          INTEGER,
    "FirstNameHebrew"  TEXT,
    "LastNameHebrew"   TEXT,
    "FirstNameEnglish" TEXT,
    "LastNameEnglish"  TEXT,
    "Country"          TEXT,
    "QualifiedFields"  TEXT
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
        j.country,
        (
            SELECT string_agg(f2.fieldname, ', ')
            FROM judgefield jf2
            INNER JOIN field f2 ON jf2.fieldid = f2.fieldid
            WHERE jf2.judgeid = j.judgeid
        )
    FROM judge j
    WHERE (p_FieldId IS NULL OR EXISTS (
        SELECT 1 FROM judgefield jf WHERE jf.judgeid = j.judgeid AND jf.fieldid = p_FieldId
    ))
    ORDER BY j.firstnamehebrew ASC;
END;
$$;
