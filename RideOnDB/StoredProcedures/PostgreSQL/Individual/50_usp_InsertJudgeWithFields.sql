CREATE OR REPLACE FUNCTION usp_InsertJudgeWithFields(
    p_FirstNameHebrew  TEXT,
    p_LastNameHebrew   TEXT,
    p_FirstNameEnglish TEXT,
    p_LastNameEnglish  TEXT,
    p_Country          TEXT,
    p_FieldIdsCsv      TEXT
)
RETURNS TABLE("NewJudgeId" INTEGER)
LANGUAGE plpgsql AS $$
DECLARE
    v_new_id INTEGER;
BEGIN
    IF p_FieldIdsCsv IS NULL OR TRIM(p_FieldIdsCsv) = '' THEN
        RAISE EXCEPTION 'Cannot create judge: At least one field must be provided.';
    END IF;

    INSERT INTO judge (firstnamehebrew, lastnamehebrew, firstnameenglish, lastnameenglish, country)
    VALUES (p_FirstNameHebrew, p_LastNameHebrew, p_FirstNameEnglish, p_LastNameEnglish, p_Country)
    RETURNING judgeid INTO v_new_id;

    INSERT INTO judgefield (judgeid, fieldid)
    SELECT v_new_id, CAST(TRIM(val) AS SMALLINT)
    FROM unnest(string_to_array(p_FieldIdsCsv, ',')) AS val;

    RETURN QUERY SELECT v_new_id AS "NewJudgeId";
END;
$$;
