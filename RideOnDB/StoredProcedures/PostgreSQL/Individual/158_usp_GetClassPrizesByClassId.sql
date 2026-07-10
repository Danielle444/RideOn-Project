-- NEW. Mirrors the existing usp_GetJudgesByClassId, powering the edit-modal prefill
-- with the full set of prize rows for a class (a class can now have multiple).
CREATE OR REPLACE FUNCTION usp_GetClassPrizesByClassId(
    classincompid_param INTEGER
)
RETURNS TABLE(
    "PrizeTypeId" SMALLINT,
    "PrizeAmount" NUMERIC(10,2)
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT
        cp.prizetypeid,
        cp.prizeamount
    FROM classprize cp
    WHERE cp.classincompid = classincompid_param
    ORDER BY cp.prizetypeid;
END;
$$;
