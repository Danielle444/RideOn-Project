CREATE OR REPLACE FUNCTION usp_GetProductPricingGrid(
    "RanchId"    INTEGER,
    "CategoryId" SMALLINT
)
RETURNS TABLE(
    "ProductId"     SMALLINT,
    "ProductName"   TEXT,
    "CatalogItemId" INTEGER,
    "ItemPrice"     NUMERIC(10,2),
    "CreationDate"  TIMESTAMP
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.productid,
        p.productname,
        pc.catalogitemid,
        pc.itemprice,
        pc.creationdate
    FROM product p
    LEFT JOIN pricecatalog pc
        ON p.productid  = pc.productid
        AND pc.ranchid  = "RanchId"
        AND pc.isactive = TRUE
    WHERE p.categoryid = "CategoryId"
    ORDER BY p.productname;
END;
$$;
