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
