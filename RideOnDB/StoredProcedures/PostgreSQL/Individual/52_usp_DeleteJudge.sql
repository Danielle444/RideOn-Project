CREATE OR REPLACE FUNCTION usp_DeleteJudge(
    p_JudgeId INTEGER
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM classjudge cj WHERE cj.judgeid = p_JudgeId) THEN
        RAISE EXCEPTION 'Cannot delete judge: Judge is assigned to specific classes.';
    END IF;

    DELETE FROM judgefield WHERE judgeid = p_JudgeId;
    DELETE FROM judge WHERE judgeid = p_JudgeId;
END;
$$;
