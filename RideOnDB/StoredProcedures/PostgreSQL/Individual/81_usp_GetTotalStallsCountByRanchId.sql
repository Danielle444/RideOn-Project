CREATE OR REPLACE FUNCTION usp_GetTotalStallsCountByRanchId(
    p_RanchId INTEGER
)
RETURNS TABLE("TotalStalls" BIGINT)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT COUNT(*) FROM stall s WHERE s.ranchid = p_RanchId;
END;
$$;
