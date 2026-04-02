CREATE PROCEDURE usp_GetArenasByRanchId
    @RanchId INT
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        ArenaId, 
        ArenaName, 
        ArenaLength, 
        ArenaWidth, 
        IsCovered
    FROM Arena
    WHERE RanchId = @RanchId
    ORDER BY ArenaName;
END
GO

CREATE PROCEDURE usp_InsertArena
    @RanchId INT,
    @ArenaName NVARCHAR(100),
    @ArenaLength SMALLINT = NULL,
    @ArenaWidth SMALLINT = NULL,
    @IsCovered BIT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    -- חישוב המזהה הבא למגרש באותה חווה
    DECLARE @NewArenaId TINYINT;
    SELECT @NewArenaId = ISNULL(MAX(ArenaId), 0) + 1 
    FROM Arena 
    WHERE RanchId = @RanchId;

    INSERT INTO Arena (RanchId, ArenaId, ArenaName, ArenaLength, ArenaWidth, IsCovered)
    VALUES (@RanchId, @NewArenaId, @ArenaName, @ArenaLength, @ArenaWidth, @IsCovered);
    
    -- ה-DAL צריך לקרוא את הערך הזה ולהחזיר ל-UI כדי שהשורה החדשה תקבל ID
    SELECT @NewArenaId AS NewArenaId;
END
GO

CREATE PROCEDURE usp_UpdateArena
    @RanchId INT,
    @ArenaId TINYINT,
    @ArenaName NVARCHAR(100),
    @ArenaLength SMALLINT = NULL,
    @ArenaWidth SMALLINT = NULL,
    @IsCovered BIT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    UPDATE Arena
    SET 
        ArenaName = @ArenaName,
        ArenaLength = @ArenaLength,
        ArenaWidth = @ArenaWidth,
        IsCovered = @IsCovered
    WHERE RanchId = @RanchId 
      AND ArenaId = @ArenaId;
END
GO
