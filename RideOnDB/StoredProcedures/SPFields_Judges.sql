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
