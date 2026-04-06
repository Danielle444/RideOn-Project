CREATE OR REPLACE FUNCTION usp_UpdateJudge(
    p_JudgeId          INTEGER,
    p_FirstNameHebrew  TEXT,
    p_LastNameHebrew   TEXT,
    p_FirstNameEnglish TEXT,
    p_LastNameEnglish  TEXT,
    p_Country          TEXT,
    p_FieldIdsCsv      TEXT
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    IF p_FieldIdsCsv IS NULL OR TRIM(p_FieldIdsCsv) = '' THEN
        RAISE EXCEPTION 'Cannot update judge: At least one field must be provided.';
    END IF;

    UPDATE judge SET
        firstnamehebrew  = p_FirstNameHebrew,
        lastnamehebrew   = p_LastNameHebrew,
        firstnameenglish = p_FirstNameEnglish,
        lastnameenglish  = p_LastNameEnglish,
        country          = p_Country
    WHERE judgeid = p_JudgeId;

    DELETE FROM judgefield WHERE judgeid = p_JudgeId;

    INSERT INTO judgefield (judgeid, fieldid)
    SELECT p_JudgeId, CAST(TRIM(val) AS SMALLINT)
    FROM unnest(string_to_array(p_FieldIdsCsv, ',')) AS val;
END;
$$;
