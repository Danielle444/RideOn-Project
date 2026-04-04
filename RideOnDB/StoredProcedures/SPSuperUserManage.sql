-- fields
CREATE OR ALTER PROCEDURE usp_InsertField
    @FieldName NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;
    
    INSERT INTO Field (FieldName)
    VALUES (@FieldName);
    
    -- מחזירים את ה-ID החדש שנוצר כדי שה-UI יוכל להוסיף את השורה לטבלה מיד
    SELECT SCOPE_IDENTITY() AS NewFieldId;
END
GO

CREATE OR ALTER PROCEDURE usp_UpdateField
    @FieldId TINYINT,
    @FieldName NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;
    
    UPDATE Field
    SET FieldName = @FieldName
    WHERE FieldId = @FieldId;
END
GO

CREATE OR ALTER PROCEDURE usp_DeleteField
    @FieldId TINYINT
AS
BEGIN
    SET NOCOUNT ON;
    
    -- ולידציה 1: האם יש תחרויות בענף הזה?
    IF EXISTS (SELECT 1 FROM Competition WHERE FieldId = @FieldId)
    BEGIN
        THROW 50009, 'Cannot delete field: There are competitions associated with this field.', 1;
    END

    -- ולידציה 2: האם יש סוגי מקצים משויכים אליו?
    IF EXISTS (SELECT 1 FROM ClassType WHERE FieldId = @FieldId)
    BEGIN
        THROW 50010, 'Cannot delete field: There are class types associated with this field.', 1;
    END

    -- ולידציה 3: האם יש שופטים המוסמכים לענף זה?
    IF EXISTS (SELECT 1 FROM JudgeField WHERE FieldId = @FieldId)
    BEGIN
        THROW 50011, 'Cannot delete field: There are judges qualified for this field.', 1;
    END

    -- אם עברנו את כל הבדיקות, אפשר למחוק
    DELETE FROM Field
    WHERE FieldId = @FieldId;
END
GO

--Class

CREATE OR ALTER PROCEDURE usp_InsertClassType
    @FieldId TINYINT,
    @ClassName NVARCHAR(100),
    @JudgingSheetFormat NVARCHAR(100),
    @QualificationDescription NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    INSERT INTO ClassType (FieldId, ClassName, JudgingSheetFormat, QualificationDescription)
    VALUES (@FieldId, @ClassName, @JudgingSheetFormat, @QualificationDescription);
    
    SELECT SCOPE_IDENTITY() AS NewClassTypeId;
END
GO

CREATE OR ALTER PROCEDURE usp_UpdateClassType
    @ClassTypeId SMALLINT,
    @FieldId TINYINT,
    @ClassName NVARCHAR(100),
    @JudgingSheetFormat NVARCHAR(100),
    @QualificationDescription NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    UPDATE ClassType
    SET 
        FieldId = @FieldId,
        ClassName = @ClassName,
        JudgingSheetFormat = @JudgingSheetFormat,
        QualificationDescription = @QualificationDescription
    WHERE ClassTypeId = @ClassTypeId;
END
GO

CREATE OR ALTER PROCEDURE usp_DeleteClassType
    @ClassTypeId SMALLINT
AS
BEGIN
    SET NOCOUNT ON;
    
    -- ולידציה: האם סוג המקצה הזה כבר שובץ לתחרויות קיימות/היסטוריות?
    IF EXISTS (SELECT 1 FROM ClassInCompetition WHERE ClassTypeId = @ClassTypeId)
    BEGIN
        THROW 50012, 'Cannot delete class type: It is already used in existing or historical competitions.', 1;
    END

    -- אם הוא לא בשימוש, אפשר למחוק
    DELETE FROM ClassType
    WHERE ClassTypeId = @ClassTypeId;
END
GO

--Judge

CREATE OR ALTER PROCEDURE usp_InsertJudge
    @FirstNameHebrew NVARCHAR(50),
    @LastNameHebrew NVARCHAR(50),
    @FirstNameEnglish NVARCHAR(50),
    @LastNameEnglish NVARCHAR(50),
    @Country NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    
    INSERT INTO Judge (FirstNameHebrew, LastNameHebrew, FirstNameEnglish, LastNameEnglish, Country)
    VALUES (@FirstNameHebrew, @LastNameHebrew, @FirstNameEnglish, @LastNameEnglish, @Country);
    
    SELECT SCOPE_IDENTITY() AS NewJudgeId;
END
GO

--judges 

CREATE OR ALTER PROCEDURE usp_DeleteJudge
    @JudgeId INT
AS
BEGIN
    SET NOCOUNT ON;
    
    -- ולידציה 1: האם שובץ למקצה כלשהו אי פעם?
    IF EXISTS (SELECT 1 FROM ClassJudge WHERE JudgeId = @JudgeId)
    BEGIN
        THROW 50013, 'Cannot delete judge: Judge is assigned to specific classes.', 1;
    END

    -- ולידציה 2: האם שובץ לתחרות כלשהי אי פעם?
    IF EXISTS (SELECT 1 FROM ClassJudge WHERE JudgeId = @JudgeId)
    BEGIN
        THROW 50014, 'Cannot delete judge: Judge is assigned to competitions.', 1;
    END

    BEGIN TRANSACTION;
    BEGIN TRY
        -- מחיקת השיוכים לענפים קודם (כדי לא לחטוף שגיאת Foreign Key)
        DELETE FROM JudgeField WHERE JudgeId = @JudgeId;
        
        -- מחיקת השופט עצמו
        DELETE FROM Judge WHERE JudgeId = @JudgeId;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO

CREATE OR ALTER PROCEDURE usp_RemoveJudgeFromField
    @JudgeId INT,
    @FieldId TINYINT
AS
BEGIN
    SET NOCOUNT ON;
    
    -- כאן לא חייבים לזרוק שגיאה אם השיוך לא קיים, מספיק פשוט למחוק (אם קיים - יימחק, אם לא - לא יקרה כלום)
    DELETE FROM JudgeField 
    WHERE JudgeId = @JudgeId AND FieldId = @FieldId;
END
GO

--Prizes

CREATE OR ALTER PROCEDURE usp_InsertPrizeType
    @PrizeTypeName NVARCHAR(100),
    @PrizeDescription NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    INSERT INTO PrizeType (PrizeTypeName, PrizeDescription)
    VALUES (@PrizeTypeName, @PrizeDescription);
    
    SELECT SCOPE_IDENTITY() AS NewPrizeTypeId;
END
GO

CREATE OR ALTER PROCEDURE usp_UpdatePrizeType
    @PrizeTypeId TINYINT,
    @PrizeTypeName NVARCHAR(100),
    @PrizeDescription NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    UPDATE PrizeType
    SET 
        PrizeTypeName = @PrizeTypeName,
        PrizeDescription = @PrizeDescription
    WHERE PrizeTypeId = @PrizeTypeId;
END
GO

CREATE OR ALTER PROCEDURE usp_DeletePrizeType
    @PrizeTypeId TINYINT
AS
BEGIN
    SET NOCOUNT ON;
    
    -- ולידציה: האם סוג הפרס הזה כבר הוגדר לחלוקה במקצה כלשהו (בעבר או בעתיד)?
    IF EXISTS (SELECT 1 FROM ClassPrize WHERE PrizeTypeId = @PrizeTypeId)
    BEGIN
        THROW 50017, 'Cannot delete prize type: It is already associated with existing or historical classes.', 1;
    END

    -- אם הוא לא בשימוש, אפשר למחוק
    DELETE FROM PrizeType
    WHERE PrizeTypeId = @PrizeTypeId;
END
GO
