CREATE PROCEDURE SP_GetAllFields
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        FieldId, 
        FieldName
    FROM Field
    ORDER BY FieldName;
END
GO

CREATE PROCEDURE usp_GetAllJudges
    @FieldId TINYINT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        J.JudgeId,
        J.FirstNameHebrew,
        J.LastNameHebrew,
        J.FirstNameEnglish,
        J.LastNameEnglish,
        J.Country,
        -- קיבוץ כל הענפים של השופט למחרוזת אחת מופרדת בפסיקים לטובת התצוגה:
        (
            SELECT STRING_AGG(F.FieldName, ', ')
            FROM JudgeField JF
            INNER JOIN Field F ON JF.FieldId = F.FieldId
            WHERE JF.JudgeId = J.JudgeId
        ) AS QualifiedFields
    FROM Judge J
    -- הסינון: נביא את השופט רק אם הוא משויך לענף המבוקש (או אם לא נבחר ענף כלל)
    WHERE (@FieldId IS NULL OR EXISTS (
        SELECT 1 FROM JudgeField JF2 
        WHERE JF2.JudgeId = J.JudgeId AND JF2.FieldId = @FieldId
    ))
    ORDER BY J.FirstNameHebrew ASC;
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


