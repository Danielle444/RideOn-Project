CREATE OR REPLACE FUNCTION usp_CheckUsernameExists(
    p_Username TEXT
)
RETURNS TABLE("ExistsFlag" INTEGER)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT CASE WHEN EXISTS (
        SELECT 1 FROM systemuser su WHERE su.username = p_Username
    ) THEN 1 ELSE 0 END AS "ExistsFlag";
END;
$$;
