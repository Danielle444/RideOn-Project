CREATE OR REPLACE FUNCTION usp_AddJudgeToField(
    "JudgeId" INTEGER,
    "FieldId" SMALLINT
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM judgefield jf WHERE jf.judgeid = "JudgeId" AND jf.fieldid = "FieldId") THEN
        RAISE EXCEPTION 'Cannot add field: Judge is already assigned to this field.';
    END IF;

    INSERT INTO judgefield (judgeid, fieldid) VALUES ("JudgeId", "FieldId");
END;
$$;
