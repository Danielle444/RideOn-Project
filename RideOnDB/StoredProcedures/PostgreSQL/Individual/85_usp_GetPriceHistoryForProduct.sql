CREATE OR REPLACE FUNCTION usp_GetPriceHistoryForProduct(
    "ProductId" SMALLINT,
    "RanchId"   INTEGER
)
RETURNS TABLE(
    "CatalogItemId" INTEGER,
    "CreationDate"  TIMESTAMP,
    "ItemPrice"     NUMERIC(10,2),
    "IsActive"      BOOLEAN
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT pc.catalogitemid, pc.creationdate, pc.itemprice, pc.isactive
    FROM pricecatalog pc
    WHERE pc.productid = "ProductId" AND pc.ranchid = "RanchId"
    ORDER BY pc.creationdate DESC;
END;
$$;
