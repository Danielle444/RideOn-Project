CREATE OR REPLACE FUNCTION usp_GetCompoundsByRanchId(
    p_RanchId INTEGER
)
RETURNS TABLE("CompoundId" SMALLINT, "CompoundName" TEXT)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT sc.compoundid, sc.compoundname
    FROM stallcompound sc
    WHERE sc.ranchid = p_RanchId;
END;
$$;
