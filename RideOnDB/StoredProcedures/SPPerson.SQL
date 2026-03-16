CREATE PROCEDURE SP_InsertPerson
    @NationalId VARCHAR(9),
    @FirstName NVARCHAR(50),
    @LastName NVARCHAR(50),
    @Gender NVARCHAR(10),
    @DateOfBirth DATE,
    @CellPhone VARCHAR(20),
    @Email NVARCHAR(254)
AS
BEGIN
    INSERT INTO Person (NationalId, FirstName, LastName, Gender, DateOfBirth, CellPhone, Email)
    VALUES (@NationalId, @FirstName, @LastName, @Gender, @DateOfBirth, @CellPhone, @Email);

    -- מחזירים את ה-ID החדש שנוצר כדי שה-DAL יוכל להעביר אותו ל-BL
    SELECT SCOPE_IDENTITY();
END
GO

CREATE PROCEDURE SP_RegisterSystemUser
    -- Person parameters
    @NationalId VARCHAR(9),
    @FirstName NVARCHAR(50),
    @LastName NVARCHAR(50),
    @Gender NVARCHAR(10),
    @DateOfBirth DATE,
    @CellPhone VARCHAR(20),
    @Email NVARCHAR(254),
    -- SystemUser parameters
    @Username NVARCHAR(100),
    @PasswordHash NVARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRANSACTION;
    BEGIN TRY
        -- 1. Insert into base table
        INSERT INTO Person (NationalId, FirstName, LastName, Gender, DateOfBirth, CellPhone, Email)
        VALUES (@NationalId, @FirstName, @LastName, @Gender, @DateOfBirth, @CellPhone, @Email);

        -- 2. Get the newly created PersonId
        DECLARE @NewPersonId INT = SCOPE_IDENTITY();

        -- 3. Insert into derived table using the new ID
        INSERT INTO SystemUser (SystemUserId, Username, PasswordHash)
        VALUES (@NewPersonId, @Username, @PasswordHash);

        -- If we got here, everything succeeded
        COMMIT TRANSACTION;
        
        -- Return the new ID to the DAL
        SELECT @NewPersonId AS NewPersonId;
    END TRY
    BEGIN CATCH
        -- If anything failed, rollback everything
        ROLLBACK TRANSACTION;
        THROW; 
    END CATCH
END
GO
-- סינון לפי שם, ניתן להוסיף סינון לפי חווה, תפקיד, אחר כך

CREATE PROCEDURE SP_SearchPersons
    @SearchText NVARCHAR(100) = NULL, -- יכול להכיל חלק משם פרטי או משפחה
    @IsActive BIT = NULL
    -- TODO: Add @RanchId INT = NULL, @RoleId TINYINT = NULL when needed
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        P.PersonId, 
        P.NationalId,
        P.FirstName, 
        P.LastName, 
        P.Email, 
        P.CellPhone,
        SU.Username, 
        SU.IsActive
        -- TODO: Add fields from Role or Ranch tables
    FROM Person P
    INNER JOIN SystemUser SU ON P.PersonId = SU.SystemUserId
    -- TODO: Add JOINs here for Roles / FederationMember
    WHERE 
        (@SearchText IS NULL OR 
         P.FirstName LIKE '%' + @SearchText + '%' OR 
         P.LastName LIKE '%' + @SearchText + '%')
        AND
        (@IsActive IS NULL OR SU.IsActive = @IsActive)
END
GO

CREATE PROCEDURE SP_CheckEmailExists
    @Email NVARCHAR(254)
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Returns the count of matching emails
    SELECT COUNT(*) 
    FROM Person 
    WHERE Email = @Email;
END
GO

CREATE PROCEDURE SP_CheckNationalIdExists
    @NationalId VARCHAR(9)
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Returns the count of matching National IDs
    SELECT COUNT(*) 
    FROM Person 
    WHERE NationalId = @NationalId;
END
GO

--update

CREATE PROCEDURE SP_UpdatePerson
    @PersonId INT,
    @FirstName NVARCHAR(50),
    @LastName NVARCHAR(50),
    @Gender NVARCHAR(10),
    @CellPhone VARCHAR(20),
    @Email NVARCHAR(254)
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE Person
    SET 
        FirstName = @FirstName,
        LastName = @LastName,
        Gender = @Gender,
        CellPhone = @CellPhone,
        Email = @Email
    WHERE 
        PersonId = @PersonId;
END
GO
