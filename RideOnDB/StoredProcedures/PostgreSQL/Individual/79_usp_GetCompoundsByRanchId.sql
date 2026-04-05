CREATE OR REPLACE FUNCTION usp_GetCompoundsByRanchId(
    "RanchId" INTEGER
)
RETURNS TABLE("CompoundId" SMALLINT, "CompoundName" TEXT)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT sc.compoundid, sc.compoundname
    FROM stallcompound sc
    WHERE sc.ranchid = "RanchId";
END;
$$;
