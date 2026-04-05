CREATE OR REPLACE FUNCTION usp_CheckNationalIdExists(
    "NationalId" TEXT
)
RETURNS TABLE("ExistsFlag" INTEGER)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT CASE WHEN EXISTS (
        SELECT 1 FROM person p WHERE p.nationalid = "NationalId"
    ) THEN 1 ELSE 0 END AS "ExistsFlag";
END;
$$;
