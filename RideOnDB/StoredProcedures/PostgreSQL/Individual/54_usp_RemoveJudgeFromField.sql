CREATE OR REPLACE FUNCTION usp_RemoveJudgeFromField(
    "JudgeId" INTEGER,
    "FieldId" SMALLINT
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    DELETE FROM judgefield WHERE judgeid = "JudgeId" AND fieldid = "FieldId";
END;
$$;
