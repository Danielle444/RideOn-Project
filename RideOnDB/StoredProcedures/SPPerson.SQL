USE RideOn;
GO
/* =========================================================
   1) VALIDATIONS (Pre-Registration Checks)
   ========================================================= */
   
CREATE PROCEDURE usp_CheckNationalIdExists
    @NationalId VARCHAR(9)
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        CASE 
            WHEN EXISTS (
                SELECT 1 
                FROM Person 
                WHERE NationalId = @NationalId
            )
            THEN 1 
            ELSE 0 
        END AS ExistsFlag;
END
GO

CREATE PROCEDURE usp_CheckUsernameExists
    @Username NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        CASE 
            WHEN EXISTS (
                SELECT 1
                FROM SystemUser
                WHERE Username = @Username
            )
            THEN 1
            ELSE 0
        END AS ExistsFlag;
END
GO


/* =========================================================
   2) REGISTRATION
   ========================================================= */
CREATE PROCEDURE usp_RegisterSystemUser
    @NationalId VARCHAR(9),
    @FirstName NVARCHAR(50),
    @LastName NVARCHAR(50),
    @Gender NVARCHAR(10) = NULL,
    @DateOfBirth DATE = NULL,
    @CellPhone VARCHAR(20),
    @Email NVARCHAR(254),
    @Username NVARCHAR(100),
    @PasswordHash NVARCHAR(255),
    @PasswordSalt NVARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRANSACTION;
    BEGIN TRY

        IF EXISTS (SELECT 1 FROM SystemUser WHERE Username = @Username)
        BEGIN
            THROW 50001, 'Username already exists', 1;
        END

        IF EXISTS (SELECT 1 FROM Person WHERE NationalId = @NationalId)
        BEGIN
            THROW 50002, 'NationalId already exists', 1;
        END

        INSERT INTO Person (NationalId, FirstName, LastName, Gender, DateOfBirth, CellPhone, Email)
        VALUES (@NationalId, @FirstName, @LastName, @Gender, @DateOfBirth, @CellPhone, @Email);

        DECLARE @NewPersonId INT = SCOPE_IDENTITY();

        INSERT INTO SystemUser (SystemUserId, Username, PasswordHash, PasswordSalt)
        VALUES (@NewPersonId, @Username, @PasswordHash, @PasswordSalt);

        COMMIT TRANSACTION;

        SELECT @NewPersonId AS NewPersonId;

    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        THROW; 
    END CATCH
END
GO

/* =========================================================
   3) PERSON-RANCH-ROLE ASSIGNMENT
   ========================================================= */

CREATE PROCEDURE usp_AssignPersonRoleAtRanch
    @PersonId INT,
    @RanchId INT,
    @RoleId TINYINT,
    @RoleStatus NVARCHAR(20) = 'Pending'
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRANSACTION;
    BEGIN TRY

        -- 1. Validation - RoleStatus
        IF @RoleStatus NOT IN ('Pending', 'Approved', 'Rejected')
        BEGIN
            THROW 50003, 'Invalid RoleStatus', 1;
        END

        -- 2. Validation - Person exists
        IF NOT EXISTS (SELECT 1 FROM Person WHERE PersonId = @PersonId)
        BEGIN
            THROW 50004, 'Person does not exist', 1;
        END

        -- 3. Validation - Ranch exists
        IF NOT EXISTS (SELECT 1 FROM Ranch WHERE RanchId = @RanchId)
        BEGIN
            THROW 50005, 'Ranch does not exist', 1;
        END

        -- 4. Validation - Role exists
        IF NOT EXISTS (SELECT 1 FROM Role WHERE RoleId = @RoleId)
        BEGIN
            THROW 50006, 'Role does not exist', 1;
        END

        -- 5. Ensure Person-Ranch exists
        IF NOT EXISTS (
            SELECT 1 
            FROM PersonRanch 
            WHERE PersonId = @PersonId AND RanchId = @RanchId
        )
        BEGIN
            INSERT INTO PersonRanch (PersonId, RanchId) 
            VALUES (@PersonId, @RanchId);
        END

        -- 6. Insert or update role
        IF NOT EXISTS (
            SELECT 1 
            FROM PersonRanchRole 
            WHERE PersonId = @PersonId AND RanchId = @RanchId AND RoleId = @RoleId
        )
        BEGIN
            INSERT INTO PersonRanchRole (PersonId, RanchId, RoleId, RoleStatus)
            VALUES (@PersonId, @RanchId, @RoleId, @RoleStatus);
        END
        ELSE
        BEGIN
            UPDATE PersonRanchRole
            SET RoleStatus = @RoleStatus
            WHERE PersonId = @PersonId 
              AND RanchId = @RanchId 
              AND RoleId = @RoleId;
        END

        COMMIT TRANSACTION;

    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO


CREATE PROCEDURE usp_UpdatePersonRoleStatus
    @PersonId INT,
    @RanchId INT,
    @RoleId TINYINT,
    @RoleStatus NVARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRANSACTION;
    BEGIN TRY

        -- Validation - RoleStatus
        IF @RoleStatus NOT IN ('Pending', 'Approved', 'Rejected')
        BEGIN
            THROW 50007, 'Invalid RoleStatus', 1;
        END

        -- Validation - row exists
        IF NOT EXISTS (
            SELECT 1
            FROM PersonRanchRole
            WHERE PersonId = @PersonId
              AND RanchId = @RanchId
              AND RoleId = @RoleId
        )
        BEGIN
            THROW 50008, 'PersonRanchRole does not exist', 1;
        END

        UPDATE PersonRanchRole
        SET RoleStatus = @RoleStatus
        WHERE PersonId = @PersonId
          AND RanchId = @RanchId
          AND RoleId = @RoleId;

        COMMIT TRANSACTION;

    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO

/* =========================================================
   4) AUTHENTICATION (LOGIN)
   ========================================================= */

   CREATE PROCEDURE usp_GetSystemUserForLogin
    @Username NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
    SU.SystemUserId,
    SU.Username,
    SU.PasswordHash,
    SU.PasswordSalt,
    SU.IsActive,
    SU.MustChangePassword,
    SU.CreatedDate,
    P.FirstName,
    P.LastName
FROM SystemUser SU
INNER JOIN Person P 
    ON SU.SystemUserId = P.PersonId
WHERE SU.Username = @Username;
END
GO


CREATE PROCEDURE usp_GetApprovedPersonRanchesAndRoles
    @PersonId INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        PRR.RanchId,
        R.RanchName,
        PRR.RoleId,
        RL.RoleName
    FROM PersonRanchRole PRR
    INNER JOIN Ranch R 
        ON PRR.RanchId = R.RanchId
    INNER JOIN Role RL 
        ON PRR.RoleId = RL.RoleId
    WHERE PRR.PersonId = @PersonId
      AND PRR.RoleStatus = 'Approved';
END
GO

/* =========================================================
   5) PASSWORD MANAGEMENT
   ========================================================= */

   CREATE PROCEDURE usp_UpdateSystemUserPassword
    @SystemUserId INT,
    @NewPasswordHash NVARCHAR(255),
    @NewPasswordSalt NVARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE SystemUser
    SET 
        PasswordHash = @NewPasswordHash,
        PasswordSalt = @NewPasswordSalt,
        MustChangePassword = 0
    WHERE SystemUserId = @SystemUserId
      AND IsActive = 1;
END
GO

CREATE PROCEDURE usp_SetMustChangePassword
    @SystemUserId INT,
    @MustChangePassword BIT
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE SystemUser
    SET MustChangePassword = @MustChangePassword
    WHERE SystemUserId = @SystemUserId;
END
GO
   /* =========================================================
   6) USER STATUS MANAGEMENT
   ========================================================= */

   CREATE PROCEDURE usp_ToggleSystemUserStatus
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


/* =========================================================
   7) USER DATA MANAGEMENT
   ========================================================= */

   CREATE PROCEDURE usp_GetPersonRanchesAndRoles
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


   CREATE PROCEDURE usp_UpdatePerson
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

CREATE PROCEDURE usp_SearchPersons
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


/* =========================================================
   8) FEDERATION MEMBERS
   ========================================================= */

   CREATE PROCEDURE usp_InsertOrUpgradeFederationMember
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


CREATE PROCEDURE usp_GetAllFederationMembers
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


/* =========================================================
   9) ADMIN MANAGED USERS
   ========================================================= */

   CREATE PROCEDURE usp_AddManagedPerson
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


CREATE PROCEDURE usp_GetManagedPersons
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


/* =========================================================
   10) LEGACY / NOT USED IN CURRENT FLOW
   ========================================================= */

CREATE PROCEDURE usp_InsertPerson
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

    SELECT SCOPE_IDENTITY();
END
GO


CREATE PROCEDURE usp_CheckEmailExists
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







