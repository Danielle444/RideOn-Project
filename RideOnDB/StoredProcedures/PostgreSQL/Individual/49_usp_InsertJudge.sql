CREATE OR REPLACE FUNCTION usp_InsertJudge(
    p_FirstNameHebrew  TEXT,
    p_LastNameHebrew   TEXT,
    p_FirstNameEnglish TEXT,
    p_LastNameEnglish  TEXT,
    p_Country          TEXT
)
RETURNS TABLE("NewJudgeId" INTEGER)
LANGUAGE plpgsql AS $$
DECLARE
    v_new_id INTEGER;
BEGIN
    INSERT INTO judge (firstnamehebrew, lastnamehebrew, firstnameenglish, lastnameenglish, country)
    VALUES (p_FirstNameHebrew, p_LastNameHebrew, p_FirstNameEnglish, p_LastNameEnglish, p_Country)
    RETURNING judgeid INTO v_new_id;

    RETURN QUERY SELECT v_new_id AS "NewJudgeId";
END;
$$;
