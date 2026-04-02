-- fields
CREATE PROCEDURE usp_InsertField
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

CREATE PROCEDURE usp_UpdateField
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

CREATE PROCEDURE usp_DeleteField
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

