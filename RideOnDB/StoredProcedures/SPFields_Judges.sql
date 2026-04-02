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

CREATE PROCEDURE SP_GetJudgesByField
    @FieldId TINYINT
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
    INNER JOIN JudgeField JF ON J.JudgeId = JF.JudgeId
    WHERE JF.FieldId = @FieldId
    ORDER BY J.FirstNameHebrew;
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


