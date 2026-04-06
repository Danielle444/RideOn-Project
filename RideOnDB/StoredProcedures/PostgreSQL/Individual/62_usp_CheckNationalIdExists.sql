CREATE OR REPLACE FUNCTION usp_CheckNationalIdExists(
    p_NationalId TEXT
)
RETURNS TABLE("ExistsFlag" INTEGER)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT CASE WHEN EXISTS (
        SELECT 1 FROM person p WHERE p.nationalid = p_NationalId
    ) THEN 1 ELSE 0 END AS "ExistsFlag";
END;
$$;
