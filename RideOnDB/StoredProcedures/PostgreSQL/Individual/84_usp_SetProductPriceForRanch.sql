CREATE OR REPLACE FUNCTION usp_SetProductPriceForRanch(
    "ProductId" SMALLINT,
    "RanchId"   INTEGER,
    "NewPrice"  NUMERIC(10,2)
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE pricecatalog SET isactive = FALSE
    WHERE productid = "ProductId" AND ranchid = "RanchId" AND isactive = TRUE;

    INSERT INTO pricecatalog (productid, ranchid, creationdate, itemprice, isactive)
    VALUES ("ProductId", "RanchId", NOW(), "NewPrice", TRUE);
END;
$$;
