CREATE OR REPLACE FUNCTION usp_GetAllFines()
RETURNS TABLE(
    "FineId"          INTEGER,
    "FineName"        TEXT,
    "FineDescription" TEXT,
    "FineAmount"      NUMERIC(10,2)
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT f.fineid, f.finename, f.finedescription, f.fineamount
    FROM fine f ORDER BY f.finename ASC;
END;
$$;
