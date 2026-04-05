CREATE OR REPLACE FUNCTION usp_UpdateFine(
    "FineId"          INTEGER,
    "FineName"        TEXT,
    "FineAmount"      NUMERIC(10,2),
    "FineDescription" TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE fine SET
        finename        = "FineName",
        finedescription = "FineDescription",
        fineamount      = "FineAmount"
    WHERE fineid = "FineId";
END;
$$;
