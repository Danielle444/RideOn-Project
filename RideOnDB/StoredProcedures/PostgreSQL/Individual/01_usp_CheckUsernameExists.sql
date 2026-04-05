CREATE OR REPLACE FUNCTION usp_CheckUsernameExists(
    "Username" TEXT
)
RETURNS TABLE("ExistsFlag" INTEGER)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT CASE WHEN EXISTS (
        SELECT 1 FROM systemuser su WHERE su.username = "Username"
    ) THEN 1 ELSE 0 END AS "ExistsFlag";
END;
$$;
