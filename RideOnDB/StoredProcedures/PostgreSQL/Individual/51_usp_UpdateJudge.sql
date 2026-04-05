CREATE OR REPLACE FUNCTION usp_UpdateJudge(
    "JudgeId"          INTEGER,
    "FirstNameHebrew"  TEXT,
    "LastNameHebrew"   TEXT,
    "FirstNameEnglish" TEXT,
    "LastNameEnglish"  TEXT,
    "Country"          TEXT,
    "FieldIdsCsv"      TEXT
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    IF "FieldIdsCsv" IS NULL OR TRIM("FieldIdsCsv") = '' THEN
        RAISE EXCEPTION 'Cannot update judge: At least one field must be provided.';
    END IF;

    UPDATE judge SET
        firstnamehebrew  = "FirstNameHebrew",
        lastnamehebrew   = "LastNameHebrew",
        firstnameenglish = "FirstNameEnglish",
        lastnameenglish  = "LastNameEnglish",
        country          = "Country"
    WHERE judgeid = "JudgeId";

    DELETE FROM judgefield WHERE judgeid = "JudgeId";

    INSERT INTO judgefield (judgeid, fieldid)
    SELECT "JudgeId", CAST(TRIM(val) AS SMALLINT)
    FROM unnest(string_to_array("FieldIdsCsv", ',')) AS val;
END;
$$;
