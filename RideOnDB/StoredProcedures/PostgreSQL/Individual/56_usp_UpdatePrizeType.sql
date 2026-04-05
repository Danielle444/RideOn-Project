CREATE OR REPLACE FUNCTION usp_UpdatePrizeType(
    "PrizeTypeId"     SMALLINT,
    "PrizeTypeName"   TEXT,
    "PrizeDescription" TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE prizetype SET
        prizetypename   = "PrizeTypeName",
        prizedescription = "PrizeDescription"
    WHERE prizetypeid = "PrizeTypeId";
END;
$$;
