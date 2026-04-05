CREATE OR REPLACE FUNCTION usp_DeletePrizeType(
    "PrizeTypeId" SMALLINT
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM classprize cp WHERE cp.prizetypeid = "PrizeTypeId") THEN
        RAISE EXCEPTION 'Cannot delete prize type: It is already associated with existing or historical classes.';
    END IF;
    DELETE FROM prizetype WHERE prizetypeid = "PrizeTypeId";
END;
$$;
