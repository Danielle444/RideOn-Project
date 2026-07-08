CREATE OR REPLACE FUNCTION usp_CheckUsernameExists(
    username_param TEXT
)
RETURNS TABLE("ExistsFlag" INTEGER)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT CASE WHEN EXISTS (
        SELECT 1 FROM systemuser su WHERE LOWER(su.username) = LOWER(username_param)
    ) THEN 1 ELSE 0 END AS "ExistsFlag";
END;
$$;
