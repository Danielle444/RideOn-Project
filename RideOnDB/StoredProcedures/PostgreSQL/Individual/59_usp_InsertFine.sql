CREATE OR REPLACE FUNCTION usp_InsertFine(
    p_FineName        TEXT,
    p_FineAmount      NUMERIC(10,2),
    p_FineDescription TEXT DEFAULT NULL
)
RETURNS TABLE("NewFineId" INTEGER)
LANGUAGE plpgsql AS $$
DECLARE
    v_new_id INTEGER;
BEGIN
    INSERT INTO fine (finename, finedescription, fineamount)
    VALUES (p_FineName, p_FineDescription, p_FineAmount)
    RETURNING fineid INTO v_new_id;

    RETURN QUERY SELECT v_new_id AS "NewFineId";
END;
$$;
