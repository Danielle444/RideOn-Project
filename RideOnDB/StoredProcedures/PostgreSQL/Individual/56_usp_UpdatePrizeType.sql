CREATE OR REPLACE FUNCTION usp_UpdatePrizeType(
    p_PrizeTypeId     SMALLINT,
    p_PrizeTypeName   TEXT,
    p_PrizeDescription TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE prizetype SET
        prizetypename   = p_PrizeTypeName,
        prizedescription = p_PrizeDescription
    WHERE prizetypeid = p_PrizeTypeId;
END;
$$;
