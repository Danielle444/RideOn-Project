CREATE OR REPLACE FUNCTION usp_DeleteJudge(
    "JudgeId" INTEGER
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM classjudge cj WHERE cj.judgeid = "JudgeId") THEN
        RAISE EXCEPTION 'Cannot delete judge: Judge is assigned to specific classes.';
    END IF;

    DELETE FROM judgefield WHERE judgeid = "JudgeId";
    DELETE FROM judge WHERE judgeid = "JudgeId";
END;
$$;
