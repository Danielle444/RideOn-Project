CREATE OR REPLACE FUNCTION usp_DeleteFine(
    "FineId" INTEGER
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    DELETE FROM fine WHERE fineid = "FineId";
END;
$$;
