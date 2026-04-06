CREATE OR REPLACE FUNCTION usp_GetActivePricesByCategory(
    p_CategoryId SMALLINT,
    p_RanchId    INTEGER
)
RETURNS TABLE(
    "ProductId"      SMALLINT,
    "ProductName"    TEXT,
    "PriceCatalogId" INTEGER,
    "ItemPrice"      NUMERIC(10,2)
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT p.productid, p.productname, pc.pricecatalogid, pc.itemprice
    FROM product p
    INNER JOIN pricecatalog pc ON p.productid = pc.productid
    WHERE p.categoryid  = p_CategoryId
      AND pc.ranchid    = p_RanchId
      AND pc.isactive   = TRUE;
END;
$$;
