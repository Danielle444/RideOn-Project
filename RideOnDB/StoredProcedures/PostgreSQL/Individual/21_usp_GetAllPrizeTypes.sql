CREATE OR REPLACE FUNCTION usp_GetAllPrizeTypes()
RETURNS TABLE(
    "PrizeTypeId"   SMALLINT,
    "PrizeTypeName" TEXT,
    "PrizeDescription" TEXT
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT pt.prizetypeid, pt.prizetypename, pt.prizedescription
    FROM prizetype pt
    ORDER BY pt.prizetypename ASC;
END;
$$;
