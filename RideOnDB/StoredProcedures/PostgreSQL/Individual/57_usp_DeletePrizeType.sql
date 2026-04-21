CREATE OR REPLACE FUNCTION usp_DeletePrizeType(
    p_PrizeTypeId SMALLINT
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM classprize cp WHERE cp.prizetypeid = p_PrizeTypeId) THEN
        RAISE EXCEPTION 'Cannot delete prize type: It is already associated with existing or historical classes.';
    END IF;
    DELETE FROM prizetype WHERE prizetypeid = p_PrizeTypeId;
END;
$$;
