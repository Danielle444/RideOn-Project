CREATE OR REPLACE FUNCTION usp_GetActivePricesByCategory(
    "CategoryId" SMALLINT,
    "RanchId"    INTEGER
)
RETURNS TABLE(
    "ProductId"     SMALLINT,
    "ProductName"   TEXT,
    "CatalogItemId" INTEGER,
    "ItemPrice"     NUMERIC(10,2)
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT p.productid, p.productname, pc.catalogitemid, pc.itemprice
    FROM product p
    INNER JOIN pricecatalog pc ON p.productid = pc.productid
    WHERE p.categoryid  = "CategoryId"
      AND pc.ranchid    = "RanchId"
      AND pc.isactive   = TRUE;
END;
$$;
