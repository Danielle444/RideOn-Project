CREATE OR REPLACE FUNCTION usp_CheckSuperUserEmailExists(
    email_param TEXT
)
RETURNS TABLE("ExistsFlag" INTEGER)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT CASE WHEN EXISTS (
        SELECT 1 FROM superuser su WHERE LOWER(su.email) = LOWER(email_param)
    ) THEN 1 ELSE 0 END AS "ExistsFlag";
END;
$$;
