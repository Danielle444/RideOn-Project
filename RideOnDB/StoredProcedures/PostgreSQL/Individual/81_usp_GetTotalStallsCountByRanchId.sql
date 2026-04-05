CREATE OR REPLACE FUNCTION usp_GetTotalStallsCountByRanchId(
    "RanchId" INTEGER
)
RETURNS TABLE("TotalStalls" BIGINT)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT COUNT(*) FROM stall s WHERE s.ranchid = "RanchId";
END;
$$;
