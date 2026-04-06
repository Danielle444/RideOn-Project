CREATE OR REPLACE FUNCTION usp_GetProductPricingGrid(
    p_RanchId    INTEGER,
    p_CategoryId SMALLINT
)
RETURNS TABLE(
    "ProductId"      SMALLINT,
    "ProductName"    TEXT,
    "PriceCatalogId" INTEGER,
    "ItemPrice"      NUMERIC(10,2),
    "CreationDate"   TIMESTAMPTZ
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.productid,
        p.productname,
        pc.pricecatalogid,
        pc.itemprice,
        pc.creationdate
    FROM product p
    LEFT JOIN pricecatalog pc
        ON p.productid  = pc.productid
        AND pc.ranchid  = p_RanchId
        AND pc.isactive = TRUE
    WHERE p.categoryid = p_CategoryId
    ORDER BY p.productname;
END;
$$;
