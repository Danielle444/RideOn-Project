CREATE OR REPLACE FUNCTION usp_AddJudgeToField(
    p_JudgeId INTEGER,
    p_FieldId SMALLINT
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM judgefield jf WHERE jf.judgeid = p_JudgeId AND jf.fieldid = p_FieldId) THEN
        RAISE EXCEPTION 'Cannot add field: Judge is already assigned to this field.';
    END IF;

    INSERT INTO judgefield (judgeid, fieldid) VALUES (p_JudgeId, p_FieldId);
END;
$$;
