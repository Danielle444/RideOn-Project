CREATE OR REPLACE FUNCTION usp_GetPriceHistoryForProduct(
    p_ProductId SMALLINT,
    p_RanchId   INTEGER
)
RETURNS TABLE(
    "PriceCatalogId" INTEGER,
    "CreationDate"   TIMESTAMPTZ,
    "ItemPrice"      NUMERIC(10,2),
    "IsActive"       BOOLEAN
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT pc.pricecatalogid, pc.creationdate, pc.itemprice, pc.isactive
    FROM pricecatalog pc
    WHERE pc.productid = p_ProductId AND pc.ranchid = p_RanchId
    ORDER BY pc.creationdate DESC;
END;
$$;
