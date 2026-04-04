CREATE OR ALTER PROCEDURE usp_GetAllFields
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

CREATE OR ALTER PROCEDURE usp_GetAllJudges
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
        (
            SELECT STRING_AGG(F.FieldName, ', ')
            FROM JudgeField JF
            INNER JOIN Field F ON JF.FieldId = F.FieldId
            WHERE JF.JudgeId = J.JudgeId
        ) AS QualifiedFields
    FROM Judge J
    WHERE (@FieldId IS NULL OR EXISTS (
        SELECT 1
        FROM JudgeField JF2
        WHERE JF2.JudgeId = J.JudgeId
          AND JF2.FieldId = @FieldId
    ))
    ORDER BY J.FirstNameHebrew ASC;
END
GO


CREATE OR ALTER PROCEDURE usp_GetJudgesByCompetitionId
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


CREATE OR ALTER PROCEDURE usp_UpdateJudge
    @JudgeId INT,
    @FirstNameHebrew NVARCHAR(50),
    @LastNameHebrew NVARCHAR(50),
    @FirstNameEnglish NVARCHAR(50),
    @LastNameEnglish NVARCHAR(50),
    @Country NVARCHAR(50),
    @FieldIdsCsv NVARCHAR(MAX) -- מחרוזת של מזהי ענפים מעודכנים
AS
BEGIN
    SET NOCOUNT ON;
    
    -- ולידציה: חייבים לספק לפחות ענף אחד
    IF ISNULL(@FieldIdsCsv, '') = ''
    BEGIN
        THROW 50015, 'Cannot update judge: At least one field must be provided.', 1;
    END

    BEGIN TRANSACTION;
    BEGIN TRY
        -- 1. עדכון פרטי השופט
        UPDATE Judge
        SET 
            FirstNameHebrew = @FirstNameHebrew,
            LastNameHebrew = @LastNameHebrew,
            FirstNameEnglish = @FirstNameEnglish,
            LastNameEnglish = @LastNameEnglish,
            Country = @Country
        WHERE JudgeId = @JudgeId;

        -- 2. מחיקת כל הענפים הקיימים של השופט
        DELETE FROM JudgeField WHERE JudgeId = @JudgeId;

        -- 3. הכנסת הענפים המעודכנים מתוך המחרוזת
        INSERT INTO JudgeField (JudgeId, FieldId)
        SELECT @JudgeId, CAST(value AS TINYINT)
        FROM STRING_SPLIT(@FieldIdsCsv, ',');

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO

CREATE OR ALTER PROCEDURE usp_InsertJudge
    @FirstNameHebrew NVARCHAR(50),
    @LastNameHebrew NVARCHAR(50),
    @FirstNameEnglish NVARCHAR(50),
    @LastNameEnglish NVARCHAR(50),
    @Country NVARCHAR(50),
    @FieldIdsCsv NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;
    
    IF ISNULL(@FieldIdsCsv, '') = ''
    BEGIN
        THROW 50015, 'Cannot create judge: At least one field must be provided.', 1;
    END

    BEGIN TRANSACTION;
    BEGIN TRY
        DECLARE @NewJudgeId INT;

        INSERT INTO Judge
        (
            FirstNameHebrew,
            LastNameHebrew,
            FirstNameEnglish,
            LastNameEnglish,
            Country
        )
        VALUES
        (
            @FirstNameHebrew,
            @LastNameHebrew,
            @FirstNameEnglish,
            @LastNameEnglish,
            @Country
        );

        SET @NewJudgeId = SCOPE_IDENTITY();

        INSERT INTO JudgeField (JudgeId, FieldId)
        SELECT @NewJudgeId, CAST(value AS TINYINT)
        FROM STRING_SPLIT(@FieldIdsCsv, ',');

        COMMIT TRANSACTION;

        SELECT @NewJudgeId AS NewJudgeId;
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO

CREATE OR ALTER PROCEDURE usp_AddJudgeToField
    @JudgeId INT,
    @FieldId TINYINT
AS
BEGIN
    SET NOCOUNT ON;
    
    -- בדיקה האם השיוך כבר קיים כדי למנוע שגיאת כפילות (Primary Key)
    IF EXISTS (SELECT 1 FROM JudgeField WHERE JudgeId = @JudgeId AND FieldId = @FieldId)
    BEGIN
        THROW 50016, 'Cannot add field: Judge is already assigned to this field.', 1;
    END

    -- אם השיוך לא קיים, מכניסים אותו לטבלת הגישור
    INSERT INTO JudgeField (JudgeId, FieldId)
    VALUES (@JudgeId, @FieldId);
END
GO


