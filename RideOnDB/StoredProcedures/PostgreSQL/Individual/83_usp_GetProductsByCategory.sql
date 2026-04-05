CREATE OR REPLACE FUNCTION usp_GetProductsByCategory(
    CategoryId SMALLINT DEFAULT NULL
)
RETURNS TABLE(
    "ProductId"   SMALLINT,
    "CategoryId"  SMALLINT,
    "ProductName" TEXT
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT p.productid, p.categoryid, p.productname
    FROM product p
    WHERE (CategoryId IS NULL OR p.categoryid = CategoryId);
END;
$$;
