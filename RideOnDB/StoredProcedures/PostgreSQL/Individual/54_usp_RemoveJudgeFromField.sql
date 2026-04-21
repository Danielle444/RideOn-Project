CREATE OR REPLACE FUNCTION usp_RemoveJudgeFromField(
    p_JudgeId INTEGER,
    p_FieldId SMALLINT
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    DELETE FROM judgefield WHERE judgeid = p_JudgeId AND fieldid = p_FieldId;
END;
$$;
