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

-- SystemUser SP
-- 1. Get SystemUser for Login
CREATE PROCEDURE SP_GetSystemUserForLogin
    @Username NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;
    
    -- ה-DAL שולף, ה-BL מוודא את תקינות הסיסמה מול ה-Hash
    SELECT 
        SU.SystemUserId, 
        SU.PasswordHash, 
        SU.IsActive,
        P.FirstName,
        P.LastName
    FROM SystemUser SU
    INNER JOIN Person P ON SU.SystemUserId = P.PersonId
    WHERE SU.Username = @Username;
END
GO

-- 2. Toggle Status (Logical Delete / Restore)
CREATE PROCEDURE SP_ToggleSystemUserStatus
    @SystemUserId INT,
    @IsActive BIT
AS
BEGIN
    SET NOCOUNT ON;
    
    UPDATE SystemUser
    SET IsActive = @IsActive
    WHERE SystemUserId = @SystemUserId;
END
GO

-- Federation Members SP
-- 1. Insert or Upgrade to Federation Member
CREATE PROCEDURE SP_InsertOrUpgradeFederationMember
    -- Person parameters (Optional if PersonId is provided)
    @PersonId INT = NULL, 
    @NationalId VARCHAR(9) = NULL,
    @FirstName NVARCHAR(50) = NULL,
    @LastName NVARCHAR(50) = NULL,
    @Gender NVARCHAR(10) = NULL,
    @DateOfBirth DATE = NULL,
    @CellPhone VARCHAR(20) = NULL,
    @Email NVARCHAR(254) = NULL,
    
    -- FederationMember parameters (Required)
    @HasValidMembership BIT,
    @MedicalCheckValidUntil DATE,
    @CertificationLevel NVARCHAR(30)
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRANSACTION;
    BEGIN TRY
        DECLARE @CurrentPersonId INT = @PersonId;

        -- אם ה-Controller/BL לא שלחו PersonId, מדובר באדם חדש
        IF @CurrentPersonId IS NULL
        BEGIN
            INSERT INTO Person (NationalId, FirstName, LastName, Gender, DateOfBirth, CellPhone, Email)
            VALUES (@NationalId, @FirstName, @LastName, @Gender, @DateOfBirth, @CellPhone, @Email);

            SET @CurrentPersonId = SCOPE_IDENTITY();
        END

        -- הוספת הרשומה לטבלת הבת (באמצעות ה-ID הקיים או החדש)
        INSERT INTO FederationMember (FederationMemberId, HasValidMembership, MedicalCheckValidUntil, CertificationLevel)
        VALUES (@CurrentPersonId, @HasValidMembership, @MedicalCheckValidUntil, @CertificationLevel);

        COMMIT TRANSACTION;
        
        -- מחזירים את המזהה (הישן או החדש) ל-DAL
        SELECT @CurrentPersonId AS FederationMemberId;
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        THROW; 
    END CATCH
END
GO

-- 2. Get All Federation Members
CREATE PROCEDURE SP_GetAllFederationMembers
AS
BEGIN
    SET NOCOUNT ON;
    
    -- שליפת נתונים רלוונטיים מטבלת האב והבת יחד
    SELECT 
        FM.FederationMemberId,
        P.NationalId,
        P.FirstName,
        P.LastName,
        FM.HasValidMembership,
        FM.MedicalCheckValidUntil,
        FM.CertificationLevel
    FROM FederationMember FM
    INNER JOIN Person P ON FM.FederationMemberId = P.PersonId;
END
GO

-- PersonRanchRole SP

CREATE PROCEDURE SP_AssignPersonRoleAtRanch
    @PersonId INT,
    @RanchId INT,
    @RoleId TINYINT,
    @RoleStatus NVARCHAR(20) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRANSACTION;
    BEGIN TRY
        -- Step 1: Ensure the base Person-Ranch connection exists
        IF NOT EXISTS (SELECT 1 FROM PersonRanch WHERE PersonId = @PersonId AND RanchId = @RanchId)
        BEGIN
            INSERT INTO PersonRanch (PersonId, RanchId) 
            VALUES (@PersonId, @RanchId);
        END

        -- Step 2: Insert or Update the specific Role
        IF NOT EXISTS (SELECT 1 FROM PersonRanchRole WHERE PersonId = @PersonId AND RanchId = @RanchId AND RoleId = @RoleId)
        BEGIN
            INSERT INTO PersonRanchRole (PersonId, RanchId, RoleId, RoleStatus)
            VALUES (@PersonId, @RanchId, @RoleId, @RoleStatus);
        END
        ELSE
        BEGIN
            -- Update status if role already exists (e.g., from 'Pending' to 'Active')
            UPDATE PersonRanchRole
            SET RoleStatus = @RoleStatus
            WHERE PersonId = @PersonId AND RanchId = @RanchId AND RoleId = @RoleId;
        END

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO

CREATE PROCEDURE SP_GetPersonRanchesAndRoles
    @PersonId INT
AS
BEGIN
    SET NOCOUNT ON;
    
    -- שליפה שטוחה (Flat) שה-BL ב-C# יצטרך למפות לאובייקטים מתאימים (DTOs)
    SELECT 
        PRR.RanchId,
        R.RanchName,
        PRR.RoleId,
        Rl.RoleName,
        PRR.RoleStatus
    FROM PersonRanchRole PRR
    INNER JOIN Ranch R ON PRR.RanchId = R.RanchId
    INNER JOIN Role Rl ON PRR.RoleId = Rl.RoleId
    WHERE PRR.PersonId = @PersonId;
END
GO

-- Admin manages people 

CREATE PROCEDURE SP_AddManagedPerson
    @SystemUserId INT,
    @PersonId INT,
    @ApprovalStatus NVARCHAR(20) = 'Pending'
AS
BEGIN
    SET NOCOUNT ON;
    
    -- משתמשים ב-GETDATE() כדי למלא את תאריך הבקשה ברמת ה-DB
    INSERT INTO PersonManagedBySystemUser (SystemUserId, PersonId, RequestDate, ApprovalStatus)
    VALUES (@SystemUserId, @PersonId, SYSDATETIME(), @ApprovalStatus);
END
GO


CREATE PROCEDURE SP_GetManagedPersons
    @SystemUserId INT
AS
BEGIN
    SET NOCOUNT ON;
    
    -- מחזירים גם את פרטי האדם מתוך טבלת Person כדי שה-Client יוכל להציג אותם
    SELECT 
        M.PersonId,
        P.FirstName,
        P.LastName,
        P.NationalId,
        M.RequestDate,
        M.ApprovalStatus
    FROM PersonManagedBySystemUser M
    INNER JOIN Person P ON M.PersonId = P.PersonId
    WHERE M.SystemUserId = @SystemUserId;
END
GO
