--Arena SP

CREATE PROCEDURE SP_InsertArena
    @RanchId INT,
    @ArenaName NVARCHAR(100),
    @ArenaLength SMALLINT = NULL,
    @ArenaWidth SMALLINT = NULL,
    @IsCovered BIT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    -- חישוב המזהה הבא עבור הזירה באותה חווה ספציפית
    DECLARE @NewArenaId TINYINT;
    SELECT @NewArenaId = ISNULL(MAX(ArenaId), 0) + 1 
    FROM Arena 
    WHERE RanchId = @RanchId;

    INSERT INTO Arena (RanchId, ArenaId, ArenaName, ArenaLength, ArenaWidth, IsCovered)
    VALUES (@RanchId, @NewArenaId, @ArenaName, @ArenaLength, @ArenaWidth, @IsCovered);
    
    -- החזרת המזהה שנוצר ל-DAL
    SELECT @NewArenaId AS NewArenaId;
END
GO

CREATE PROCEDURE SP_GetArenasByRanchId
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
    WHERE RanchId = @RanchId;
END
GO

-- Compound and stall

CREATE PROCEDURE SP_CreateCompoundWithStalls
    @RanchId INT,
    @CompoundName NVARCHAR(100),
    @NumberOfStalls SMALLINT,
    @StallType SMALLINT -- נניח שזה סוג התא הדיפולטיבי שמוזן (למשל תא רגיל או גדול)
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRANSACTION;
    BEGIN TRY
        -- 1. יצירת מזהה חדש למתחם בחווה זו
        DECLARE @NewCompoundId TINYINT;
        SELECT @NewCompoundId = ISNULL(MAX(CompoundId), 0) + 1 
        FROM StallCompound 
        WHERE RanchId = @RanchId;

        -- 2. שמירת המתחם
        INSERT INTO StallCompound (RanchId, CompoundId, CompoundName)
        VALUES (@RanchId, @NewCompoundId, @CompoundName);

        -- 3. לולאה ליצירת התאים (Bulk Insert)
        DECLARE @CurrentStallId SMALLINT = 1;
        DECLARE @StallNumber NVARCHAR(20);

        WHILE @CurrentStallId <= @NumberOfStalls
        BEGIN
            -- נשתמש במספר התא כשם התא הדיפולטיבי (למשל תא מספר "1")
            SET @StallNumber = CAST(@CurrentStallId AS NVARCHAR(20));

            INSERT INTO Stall (RanchId, CompoundID, StallId, StallNumber, StallType)
            VALUES (@RanchId, @NewCompoundId, @CurrentStallId, @StallNumber, @StallType);

            SET @CurrentStallId = @CurrentStallId + 1;
        END

        COMMIT TRANSACTION;
        
        -- מחזירים את מזהה המתחם חזרה ל-DAL
        SELECT @NewCompoundId AS NewCompoundId;
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO

CREATE PROCEDURE SP_GetCompoundsByRanchId
    @RanchId INT
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        CompoundId, 
        CompoundName
    FROM StallCompound
    WHERE RanchId = @RanchId;
END
GO

CREATE PROCEDURE SP_GetStallsByCompoundId
    @RanchId INT,
    @CompoundId TINYINT
AS
BEGIN
    SET NOCOUNT ON;
    
    -- שים לב: המזהה של התא מורכב מהחווה + המתחם
    SELECT 
        StallId, 
        StallNumber, 
        StallType, 
        StallNotes
    FROM Stall
    WHERE RanchId = @RanchId 
      AND CompoundID = @CompoundId;
END
GO

CREATE PROCEDURE SP_GetTotalStallsCountByRanchId
    @RanchId INT
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT COUNT(*) AS TotalStalls
    FROM Stall
    WHERE RanchId = @RanchId;
END
GO
