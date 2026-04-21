CREATE OR REPLACE FUNCTION usp_GetAllRanchesNames()
RETURNS TABLE("RanchId" INTEGER, "RanchName" TEXT)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT r.ranchid, r.ranchname
    FROM ranch r
    WHERE r.ranchstatus = 'Approved'
    ORDER BY r.ranchname;
END;
$$;
