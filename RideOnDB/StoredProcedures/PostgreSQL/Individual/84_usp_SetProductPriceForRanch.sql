CREATE OR REPLACE FUNCTION usp_SetProductPriceForRanch(
    p_ProductId SMALLINT,
    p_RanchId   INTEGER,
    p_NewPrice  NUMERIC(10,2)
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE pricecatalog SET isactive = FALSE
    WHERE productid = p_ProductId AND ranchid = p_RanchId AND isactive = TRUE;

    INSERT INTO pricecatalog (productid, ranchid, creationdate, itemprice, isactive)
    VALUES (p_ProductId, p_RanchId, NOW(), p_NewPrice, TRUE);
END;
$$;
