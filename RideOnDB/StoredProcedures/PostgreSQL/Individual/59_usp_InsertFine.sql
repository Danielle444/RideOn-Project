CREATE OR REPLACE FUNCTION usp_InsertFine(
    "FineName"        TEXT,
    "FineAmount"      NUMERIC(10,2),
    "FineDescription" TEXT DEFAULT NULL
)
RETURNS TABLE("NewFineId" INTEGER)
LANGUAGE plpgsql AS $$
DECLARE
    v_new_id INTEGER;
BEGIN
    INSERT INTO fine (finename, finedescription, fineamount)
    VALUES ("FineName", "FineDescription", "FineAmount")
    RETURNING fineid INTO v_new_id;

    RETURN QUERY SELECT v_new_id AS "NewFineId";
END;
$$;
