CREATE OR REPLACE FUNCTION usp_InsertJudge(
    "FirstNameHebrew"  TEXT,
    "LastNameHebrew"   TEXT,
    "FirstNameEnglish" TEXT,
    "LastNameEnglish"  TEXT,
    "Country"          TEXT
)
RETURNS TABLE("NewJudgeId" INTEGER)
LANGUAGE plpgsql AS $$
DECLARE
    v_new_id INTEGER;
BEGIN
    INSERT INTO judge (firstnamehebrew, lastnamehebrew, firstnameenglish, lastnameenglish, country)
    VALUES ("FirstNameHebrew", "LastNameHebrew", "FirstNameEnglish", "LastNameEnglish", "Country")
    RETURNING judgeid INTO v_new_id;

    RETURN QUERY SELECT v_new_id AS "NewJudgeId";
END;
$$;
