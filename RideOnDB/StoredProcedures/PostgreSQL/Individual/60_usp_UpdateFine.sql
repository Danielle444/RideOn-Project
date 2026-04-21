CREATE OR REPLACE FUNCTION usp_UpdateFine(
    p_FineId          INTEGER,
    p_FineName        TEXT,
    p_FineAmount      NUMERIC(10,2),
    p_FineDescription TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE fine SET
        finename        = p_FineName,
        finedescription = p_FineDescription,
        fineamount      = p_FineAmount
    WHERE fineid = p_FineId;
END;
$$;
