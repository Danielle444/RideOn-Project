CREATE OR REPLACE FUNCTION usp_InsertPrizeType(
    "PrizeTypeName"   TEXT,
    "PrizeDescription" TEXT DEFAULT NULL
)
RETURNS TABLE("NewPrizeTypeId" SMALLINT)
LANGUAGE plpgsql AS $$
DECLARE
    v_new_id SMALLINT;
BEGIN
    INSERT INTO prizetype (prizetypename, prizedescription)
    VALUES ("PrizeTypeName", "PrizeDescription")
    RETURNING prizetypeid INTO v_new_id;

    RETURN QUERY SELECT v_new_id AS "NewPrizeTypeId";
END;
$$;
