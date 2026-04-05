CREATE OR REPLACE FUNCTION usp_InsertJudgeWithFields(
    "FirstNameHebrew"  TEXT,
    "LastNameHebrew"   TEXT,
    "FirstNameEnglish" TEXT,
    "LastNameEnglish"  TEXT,
    "Country"          TEXT,
    "FieldIdsCsv"      TEXT
)
RETURNS TABLE("NewJudgeId" INTEGER)
LANGUAGE plpgsql AS $$
DECLARE
    v_new_id INTEGER;
BEGIN
    IF "FieldIdsCsv" IS NULL OR TRIM("FieldIdsCsv") = '' THEN
        RAISE EXCEPTION 'Cannot create judge: At least one field must be provided.';
    END IF;

    INSERT INTO judge (firstnamehebrew, lastnamehebrew, firstnameenglish, lastnameenglish, country)
    VALUES ("FirstNameHebrew", "LastNameHebrew", "FirstNameEnglish", "LastNameEnglish", "Country")
    RETURNING judgeid INTO v_new_id;

    INSERT INTO judgefield (judgeid, fieldid)
    SELECT v_new_id, CAST(TRIM(val) AS SMALLINT)
    FROM unnest(string_to_array("FieldIdsCsv", ',')) AS val;

    RETURN QUERY SELECT v_new_id AS "NewJudgeId";
END;
$$;
