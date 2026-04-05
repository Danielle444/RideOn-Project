CREATE OR REPLACE FUNCTION usp_GetAllProductCategories()
RETURNS TABLE("CategoryId" SMALLINT, "CategoryName" TEXT)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT pc.categoryid, pc.categoryname FROM productcategory pc;
END;
$$;
