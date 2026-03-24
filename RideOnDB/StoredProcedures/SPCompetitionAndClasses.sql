CREATE PROCEDURE SP_GetRecentAndUpcomingCompetitions
    @Status NVARCHAR(20) = NULL -- פרמטר חדש אופציונלי
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @CurrentDate DATE = CAST(GETDATE() AS DATE);
    DECLARE @SixMonthsAgo DATE = DATEADD(month, -6, @CurrentDate);
    DECLARE @OneYearAhead DATE = DATEADD(year, 1, @CurrentDate);

    SELECT 
        C.CompetitionId,
        -- ... שאר העמודות ...
        C.CompetitionStatus
    FROM Competition C
    -- ... JOINs ...
    WHERE C.CompetitionStartDate >= @SixMonthsAgo 
      AND C.CompetitionStartDate <= @OneYearAhead
      -- סינון הסטטוס קורה כאן ברמת ה-DB:
      AND (@Status IS NULL OR C.CompetitionStatus = @Status) 
    ORDER BY C.CompetitionStartDate ASC;
END
GO

CREATE PROCEDURE SP_GetCompetitionsByHostRanch
    @RanchId INT
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        C.CompetitionId,
        C.CompetitionName,
        C.CompetitionStartDate,
        C.CompetitionEndDate,
        C.RegistrationOpenDate,
        C.RegistrationEndDate,
        C.CompetitionStatus,
        F.FieldName
    FROM Competition C
    INNER JOIN Field F ON C.FieldId = F.FieldId
    WHERE C.HostRanchId = @RanchId
    ORDER BY C.CompetitionStartDate DESC; -- בדרך כלל חוות רוצות לראות את החדש ביותר קודם
END
GO


CREATE PROCEDURE SP_InsertCompetition
    @HostRanchId INT,
    @FieldId TINYINT,
    @CreatedBySystemUserId INT,
    @CompetitionName NVARCHAR(100),
    @CompetitionStartDate DATE,
    @CompetitionEndDate DATE,
    @RegistrationOpenDate DATE = NULL,
    @RegistrationEndDate DATE = NULL,
    @PaidTimeRegistrationDate DATE = NULL,
    @PaidTimePublicationDate DATE = NULL,
    @CompetitionStatus NVARCHAR(20) = 'Draft', -- מקבל 'Draft' מה-BL, או משתמש בברירת המחדל של ה-SP
    @Notes NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    INSERT INTO Competition (
        HostRanchId, 
        FieldId, 
        CreatedBySystemUserId, 
        CompetitionName, 
        CompetitionStartDate, 
        CompetitionEndDate, 
        RegistrationOpenDate, 
        RegistrationEndDate, 
        PaidTimeRegistrationDate, 
        PaidTimePublicationDate, 
        CompetitionStatus, 
        Notes, 
        StallMapUrl -- נשאר NULL כרגע לפי ההחלטה
    )
    VALUES (
        @HostRanchId, 
        @FieldId, 
        @CreatedBySystemUserId, 
        @CompetitionName, 
        @CompetitionStartDate, 
        @CompetitionEndDate, 
        @RegistrationOpenDate, 
        @RegistrationEndDate, 
        @PaidTimeRegistrationDate, 
        @PaidTimePublicationDate, 
        @CompetitionStatus, 
        @Notes, 
        NULL
    );
    
    -- מחזירים ל-BL את המזהה החדש של התחרות שנוצרה
    SELECT SCOPE_IDENTITY() AS NewCompetitionId;
END
GO

--Get old competitions to duplicate classes

CREATE PROCEDURE SP_GetClassesFromLatestCompetition
    @FieldId TINYINT
AS
BEGIN
    SET NOCOUNT ON;
    
    -- 1. מציאת ה-ID של התחרות האחרונה בענף
    DECLARE @LatestCompId INT;
    
    SELECT TOP 1 @LatestCompId = CompetitionId
    FROM Competition
    WHERE FieldId = @FieldId
    ORDER BY CompetitionStartDate DESC;

    -- 2. שליפת המקצים של אותה תחרות
    IF @LatestCompId IS NOT NULL
    BEGIN
        SELECT 
            CIC.ClassInCompId,
            CIC.ClassTypeId,
            CT.ClassName,
            C.CompetitionId,
            C.CompetitionName,
            C.CompetitionStartDate,
            CIC.OrganizerCost,
            CIC.FederationCost
        FROM ClassInCompetition CIC
        INNER JOIN Competition C ON CIC.CompetitionId = C.CompetitionId
        INNER JOIN ClassType CT ON CIC.ClassTypeId = CT.ClassTypeId
        WHERE CIC.CompetitionId = @LatestCompId
        ORDER BY CIC.OrderInDay ASC;
    END
END
GO


CREATE PROCEDURE SP_GetCompetitionsByFieldLastTwoYears
    @FieldId TINYINT
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @TwoYearsAgo DATE = DATEADD(year, -2, CAST(GETDATE() AS DATE));

    SELECT 
        CompetitionId,
        CompetitionName
    FROM Competition
    WHERE FieldId = @FieldId 
      AND CompetitionStartDate >= @TwoYearsAgo
    ORDER BY CompetitionStartDate DESC;
END
GO

CREATE PROCEDURE SP_GetClassesByCompetitionId
    @CompetitionId INT
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        CIC.ClassInCompId,
        CIC.ClassTypeId,
        CT.ClassName,
        -- העמודות הבאות חשובות כדי שה-UI ידע מה היו ההגדרות, 
        -- אבל נצטרך לאפס חלק מהן בעת ההעתקה!
        CIC.OrganizerCost,
        CIC.FederationCost,
        CIC.StartTime,
        CIC.OrderInDay,
        CIC.ClassNotes
    FROM ClassInCompetition CIC
    INNER JOIN ClassType CT ON CIC.ClassTypeId = CT.ClassTypeId
    WHERE CIC.CompetitionId = @CompetitionId
    ORDER BY CIC.OrderInDay ASC;
END
GO

-- CRUD class in competition

CREATE PROCEDURE SP_InsertClassInCompetition
    @CompetitionId INT,
    @ClassTypeId SMALLINT,
    @ArenaRanchId INT,
    @ArenaId TINYINT,
    @ClassDateTime DATETIME2(0) = NULL,
    @StartTime TIME(0) = NULL,
    @OrderInDay TINYINT = NULL,
    @OrganizerCost DECIMAL(10,2) = NULL,
    @FederationCost DECIMAL(10,2) = NULL,
    @ClassNotes NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    INSERT INTO ClassInCompetition (
        CompetitionId, ClassTypeId, ArenaRanchId, ArenaId, 
        ClassDateTime, StartTime, OrderInDay, 
        OrganizerCost, FederationCost, ClassNotes
    )
    VALUES (
        @CompetitionId, @ClassTypeId, @ArenaRanchId, @ArenaId, 
        @ClassDateTime, @StartTime, @OrderInDay, 
        @OrganizerCost, @FederationCost, @ClassNotes
    );
    
    SELECT SCOPE_IDENTITY() AS NewClassInCompId;
END
GO


CREATE PROCEDURE SP_UpdateClassInCompetition
    @ClassInCompId INT,
    @ClassTypeId SMALLINT,
    @ArenaRanchId INT,
    @ArenaId TINYINT,
    @ClassDateTime DATETIME2(0) = NULL,
    @StartTime TIME(0) = NULL,
    @OrderInDay TINYINT = NULL,
    @OrganizerCost DECIMAL(10,2) = NULL,
    @FederationCost DECIMAL(10,2) = NULL,
    @ClassNotes NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    UPDATE ClassInCompetition
    SET 
        ClassTypeId = @ClassTypeId,
        ArenaRanchId = @ArenaRanchId,
        ArenaId = @ArenaId,
        ClassDateTime = @ClassDateTime,
        StartTime = @StartTime,
        OrderInDay = @OrderInDay,
        OrganizerCost = @OrganizerCost,
        FederationCost = @FederationCost,
        ClassNotes = @ClassNotes
    WHERE ClassInCompId = @ClassInCompId;
END
GO

CREATE PROCEDURE SP_DeleteClassInCompetition
    @ClassInCompId INT
AS
BEGIN
    SET NOCOUNT ON;
    
    -- ולידציה: האם יש מתחרים רשומים למקצה?
    IF EXISTS (SELECT 1 FROM Entry WHERE ClassInCompId = @ClassInCompId)
    BEGIN
        -- זריקת שגיאה יזומה. המספר חייב להיות מעל 50000.
        THROW 50001, 'Cannot delete class: There are registered entries.', 1;
    END

    BEGIN TRANSACTION;
    BEGIN TRY
        -- מחיקת הרשומות מטבלאות הגישור קודם
        DELETE FROM ClassPrize WHERE ClassInCompId = @ClassInCompId;
        DELETE FROM ClassJudge WHERE ClassInCompId = @ClassInCompId;
        
        -- מחיקת המקצה עצמו
        DELETE FROM ClassInCompetition WHERE ClassInCompId = @ClassInCompId;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO

--ClassType
CREATE PROCEDURE SP_GetClassTypesByField
    @FieldId TINYINT
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        ClassTypeId, 
        ClassName, 
        JudgingSheetFormat, 
        QualificationDescription
    FROM ClassType
    WHERE FieldId = @FieldId
    ORDER BY ClassName;
END
GO

--Prizes

CREATE PROCEDURE SP_GetAllPrizeTypes
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        PrizeTypeId, 
        PrizeTypeName, 
        PrizeDescription
    FROM PrizeType
    ORDER BY PrizeTypeId;
END
GO

--judges

CREATE PROCEDURE SP_GetJudgesByClassId
    @ClassInCompId INT
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        J.JudgeId,
        J.FirstNameHebrew,
        J.LastNameHebrew,
        J.FirstNameEnglish,
        J.LastNameEnglish,
        J.Country
    FROM Judge J
    INNER JOIN ClassJudge CJ ON J.JudgeId = CJ.JudgeId
    WHERE CJ.ClassInCompId = @ClassInCompId;
END
GO


CREATE PROCEDURE SP_GetJudgesByCompetitionId
    @CompetitionId INT
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT DISTINCT 
        J.JudgeId,
        J.FirstNameHebrew,
        J.LastNameHebrew,
        J.FirstNameEnglish,
        J.LastNameEnglish,
        J.Country
    FROM Judge J
    INNER JOIN ClassJudge CJ ON J.JudgeId = CJ.JudgeId
    INNER JOIN ClassInCompetition CIC ON CJ.ClassInCompId = CIC.ClassInCompId
    WHERE CIC.CompetitionId = @CompetitionId;
END
GO
