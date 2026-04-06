CREATE OR REPLACE FUNCTION usp_DeleteFine(
    p_FineId INTEGER
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    DELETE FROM fine WHERE fineid = p_FineId;
END;
$$;
