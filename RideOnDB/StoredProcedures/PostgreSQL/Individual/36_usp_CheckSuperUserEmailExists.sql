CREATE OR REPLACE FUNCTION usp_CheckSuperUserEmailExists(
    p_Email TEXT
)
RETURNS TABLE("ExistsFlag" INTEGER)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT CASE WHEN EXISTS (
        SELECT 1 FROM superuser su WHERE su.email = p_Email
    ) THEN 1 ELSE 0 END AS "ExistsFlag";
END;
$$;
