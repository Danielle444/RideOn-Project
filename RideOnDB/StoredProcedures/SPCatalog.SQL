CREATE OR ALTER PROCEDURE usp_GetAllProductCategories
AS
BEGIN
    SET NOCOUNT ON;
    SELECT CategoryId, CategoryName FROM ProductCategory;
END
GO

CREATE OR ALTER PROCEDURE usp_GetProductsByCategory
    @CategoryId TINYINT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    -- אם לא הועבר קטגוריה, נשלוף הכל. אם הועבר, נסנן.
    SELECT 
        ProductId, 
        CategoryId, 
        ProductName 
    FROM Product
    WHERE (@CategoryId IS NULL OR CategoryId = @CategoryId);
END
GO

-- Prices

CREATE OR ALTER PROCEDURE usp_SetProductPriceForRanch
    @ProductId SMALLINT,
    @RanchId INT,
    @NewPrice DECIMAL(10,2)
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRANSACTION;
    BEGIN TRY
        -- 1. "כיבוי" המחיר הפעיל הנוכחי של המוצר באותה חווה
        UPDATE PriceCatalog
        SET IsActive = 0
        WHERE ProductId = @ProductId 
          AND RanchId = @RanchId 
          AND IsActive = 1;

        -- 2. הכנסת המחיר החדש (או המחיר הישן שנבחר מחדש) כפעיל
        INSERT INTO PriceCatalog (ProductId, RanchId, CreationDate, ItemPrice, IsActive)
        VALUES (@ProductId, @RanchId, SYSDATETIME(), @NewPrice, 1);

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO

CREATE OR ALTER PROCEDURE usp_GetPriceHistoryForProduct
    @ProductId SMALLINT,
    @RanchId INT
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        CatalogItemId, 
        CreationDate, 
        ItemPrice, 
        IsActive
    FROM PriceCatalog
    WHERE ProductId = @ProductId 
      AND RanchId = @RanchId
    ORDER BY CreationDate DESC;
END
GO

CREATE OR ALTER PROCEDURE usp_GetActivePricesByCategory
    @CategoryId TINYINT,
    @RanchId INT
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        P.ProductId,
        P.ProductName,
        PC.CatalogItemId, -- מזהה המחיר הספציפי
        PC.ItemPrice
    FROM Product P
    INNER JOIN PriceCatalog PC ON P.ProductId = PC.ProductId
    WHERE P.CategoryId = @CategoryId 
      AND PC.RanchId = @RanchId 
      AND PC.IsActive = 1;
END
GO


--SP to get prices for secrotery view
CREATE OR ALTER PROCEDURE usp_GetProductPricingGrid
    @RanchId INT,
    @CategoryId TINYINT
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        P.ProductId,
        P.ProductName,
        PC.CatalogItemId, -- יהיה NULL אם מעולם לא הוגדר מחיר
        PC.ItemPrice,     -- יהיה NULL אם מעולם לא הוגדר מחיר
        PC.CreationDate   -- תאריך העדכון האחרון (אם קיים)
    FROM Product P
    LEFT JOIN PriceCatalog PC 
        ON P.ProductId = PC.ProductId 
        AND PC.RanchId = @RanchId 
        AND PC.IsActive = 1
    WHERE P.CategoryId = @CategoryId
    ORDER BY P.ProductName;
END
GO
