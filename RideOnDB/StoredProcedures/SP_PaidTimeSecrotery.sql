CREATE PROCEDURE SP_GetAllPaidTimeBaseSlots
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        PaidTimeSlotId, 
        DayOfWeek, 
        TimeOfDay 
    FROM PaidTimeSlot;
END
GO

CREATE PROCEDURE SP_InsertPaidTimeSlotInComp
    @CompetitionId INT,
    @PaidTimeSlotId INT,
    @ArenaRanchId INT,
    @ArenaId TINYINT,
    @SlotDate DATE,
    @StartTime TIME(0),
    @EndTime TIME(0),
    @SlotStatus NVARCHAR(20) = NULL,
    @SlotNotes NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    INSERT INTO PaidTimeSlotInCompetition (
        CompetitionId, PaidTimeSlotId, ArenaRanchId, ArenaId, 
        SlotDate, StartTime, EndTime, SlotStatus, SlotNotes
    )
    VALUES (
        @CompetitionId, @PaidTimeSlotId, @ArenaRanchId, @ArenaId, 
        @SlotDate, @StartTime, @EndTime, @SlotStatus, @SlotNotes
    );
    
    SELECT SCOPE_IDENTITY() AS NewCompSlotId;
END
GO

CREATE PROCEDURE SP_UpdatePaidTimeSlotInComp
    @CompSlotId INT,
    @PaidTimeSlotId INT,
    @ArenaRanchId INT,
    @ArenaId TINYINT,
    @SlotDate DATE,
    @StartTime TIME(0),
    @EndTime TIME(0),
    @SlotStatus NVARCHAR(20) = NULL,
    @SlotNotes NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    UPDATE PaidTimeSlotInCompetition
    SET 
        PaidTimeSlotId = @PaidTimeSlotId,
        ArenaRanchId = @ArenaRanchId,
        ArenaId = @ArenaId,
        SlotDate = @SlotDate,
        StartTime = @StartTime,
        EndTime = @EndTime,
        SlotStatus = @SlotStatus,
        SlotNotes = @SlotNotes
    WHERE CompSlotId = @CompSlotId;
END
GO

CREATE PROCEDURE SP_GetPaidTimeSlotsByCompId
    @CompetitionId INT
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        PTC.CompSlotId,
        PTC.SlotDate,
        PT.TimeOfDay,       
        PTC.StartTime,
        PTC.EndTime,
        PTC.ArenaRanchId,
        PTC.ArenaId,
        A.ArenaName         
    FROM PaidTimeSlotInCompetition PTC
    INNER JOIN PaidTimeSlot PT ON PTC.PaidTimeSlotId = PT.PaidTimeSlotId
    INNER JOIN Arena A ON PTC.ArenaRanchId = A.RanchId AND PTC.ArenaId = A.ArenaId
    WHERE PTC.CompetitionId = @CompetitionId
    ORDER BY PTC.SlotDate ASC, PTC.StartTime ASC;
END
GO

CREATE PROCEDURE SP_DeletePaidTimeSlotInComp
    @CompSlotId INT,
    @ForceDelete BIT = 0 
AS
BEGIN
    SET NOCOUNT ON;
    
    -- 1. חסימה קשיחה: האם יש משתתפים ששובצו והבקשה שלהם פעילה (לא מבוטלת)?
    IF EXISTS (
        SELECT 1 
        FROM PaidTimeRequest 
        WHERE AssignedCompSlotId = @CompSlotId 
          AND ISNULL([Status], '') <> 'Cancelled'
    )
    BEGIN
        THROW 50003, 'Cannot delete: Participants are actively ASSIGNED to this slot.', 1;
    END

    -- 2. אזהרה: האם יש בקשות פעילות (שטרם שובצו או בטיפול)?
    IF EXISTS (
        SELECT 1 
        FROM PaidTimeRequest 
        WHERE RequestedCompSlotId = @CompSlotId 
          AND ISNULL([Status], '') <> 'Cancelled'
    )
    BEGIN
        IF @ForceDelete = 0
        BEGIN
            THROW 50004, 'Warning: There are active REQUESTS for this slot. User confirmation required.', 1;
        END
    END

    -- 3. המחיקה עצמה
    DELETE FROM PaidTimeSlotInCompetition WHERE CompSlotId = @CompSlotId;
END
GO

CREATE PROCEDURE SP_GetCompetitionsWithPaidTimeLastTwoYears
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @TwoYearsAgo DATE = DATEADD(year, -2, CAST(GETDATE() AS DATE));

    SELECT 
        C.CompetitionId,
        C.CompetitionName,
        C.CompetitionStartDate
    FROM Competition C
    WHERE C.CompetitionStartDate >= @TwoYearsAgo
      -- התנאי שמוודא שיש לפייד טיים בתחרות הזו:
      AND EXISTS (
          SELECT 1 
          FROM PaidTimeSlotInCompetition PTC 
          WHERE PTC.CompetitionId = C.CompetitionId
      )
    ORDER BY C.CompetitionStartDate DESC;
END
GO

CREATE PROCEDURE SP_GetPaidTimeSlotsFromLatestCompetition
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @LatestCompId INT;
    
    SELECT TOP 1 @LatestCompId = C.CompetitionId
    FROM Competition C
    WHERE EXISTS (
        SELECT 1 
        FROM PaidTimeSlotInCompetition PTC 
        WHERE PTC.CompetitionId = C.CompetitionId
    )
    ORDER BY C.CompetitionStartDate DESC;

    IF @LatestCompId IS NOT NULL
    BEGIN
        SELECT 
            PTC.CompSlotId,
            PTC.PaidTimeSlotId,
            PT.TimeOfDay,
            PTC.ArenaRanchId, -- הוחזר לבקשתך
            PTC.ArenaId,      -- הוחזר לבקשתך
            PTC.StartTime,
            PTC.EndTime,
            PTC.SlotNotes
        FROM PaidTimeSlotInCompetition PTC
        INNER JOIN PaidTimeSlot PT ON PTC.PaidTimeSlotId = PT.PaidTimeSlotId
        WHERE PTC.CompetitionId = @LatestCompId
        ORDER BY PTC.SlotDate ASC, PTC.StartTime ASC;
    END
END
GO
