USE RideOn;
GO

/* =========================================================
   AUTH MODULE - RideOn
   כולל:
   - Validation
   - Registration
   - Login
   - Password Management
   - Lookups (Roles, Ranches)
   ========================================================= */

USE RideOn;
GO

/* =========================
   1. VALIDATION
   ========================= */

CREATE OR ALTER PROCEDURE usp_CheckUsernameExists
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


/* =========================
   2. REGISTRATION
   ========================= */

   CREATE OR ALTER TYPE RegisterRanchRoleTableType AS TABLE
(
    RanchId INT NOT NULL,
    RoleId TINYINT NOT NULL
);
GO


CREATE OR ALTER PROCEDURE usp_GetPersonByNationalIdForRegistration
    @NationalId VARCHAR(9)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        P.PersonId,
        P.NationalId,
        P.FirstName,
        P.LastName,
        P.Gender,
        P.DateOfBirth,
        P.CellPhone,
        P.Email,
        CASE 
            WHEN SU.SystemUserId IS NULL THEN CAST(0 AS BIT)
            ELSE CAST(1 AS BIT)
        END AS HasSystemUser
    FROM Person P
    LEFT JOIN SystemUser SU
        ON P.PersonId = SU.SystemUserId
    WHERE P.NationalId = @NationalId;
END
GO



CREATE OR ALTER PROCEDURE usp_RegisterSystemUserWithRoles
    @NationalId VARCHAR(9),
    @FirstName NVARCHAR(50),
    @LastName NVARCHAR(50),
    @Gender NVARCHAR(10) = NULL,
    @DateOfBirth DATE = NULL,
    @CellPhone VARCHAR(20),
    @Email NVARCHAR(254),
    @Username NVARCHAR(100),
    @PasswordHash NVARCHAR(255),
    @PasswordSalt NVARCHAR(255),
    @RanchRoles RegisterRanchRoleTableType READONLY
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRANSACTION;
    BEGIN TRY

        DECLARE @PersonId INT;

        IF EXISTS (SELECT 1 FROM SystemUser WHERE Username = @Username)
        BEGIN
            THROW 50001, 'Username already exists', 1;
        END

        IF NOT EXISTS (SELECT 1 FROM @RanchRoles)
        BEGIN
            THROW 50003, 'At least one ranch-role pair is required', 1;
        END

        IF EXISTS (
            SELECT 1
            FROM @RanchRoles rr
            LEFT JOIN Ranch r ON rr.RanchId = r.RanchId
            WHERE r.RanchId IS NULL
        )
        BEGIN
            THROW 50004, 'One or more ranches do not exist', 1;
        END

        IF EXISTS (
            SELECT 1
            FROM @RanchRoles rr
            LEFT JOIN Role rl ON rr.RoleId = rl.RoleId
            WHERE rl.RoleId IS NULL
        )
        BEGIN
            THROW 50005, 'One or more roles do not exist', 1;
        END

        -- אם האדם כבר קיים – נשתמש בו
        SELECT @PersonId = PersonId
        FROM Person
        WHERE NationalId = @NationalId;

        IF @PersonId IS NOT NULL
        BEGIN
            -- אם כבר יש לו משתמש מערכת – זו שגיאה
            IF EXISTS (
                SELECT 1
                FROM SystemUser
                WHERE SystemUserId = @PersonId
            )
            BEGIN
                THROW 50002, 'NationalId already belongs to an existing system user', 1;
            END

            -- עדכון שדות חסרים בלבד, כדי לא לדרוס מידע קיים
            UPDATE Person
            SET
                FirstName = CASE WHEN (FirstName IS NULL OR LTRIM(RTRIM(FirstName)) = '') THEN @FirstName ELSE FirstName END,
                LastName = CASE WHEN (LastName IS NULL OR LTRIM(RTRIM(LastName)) = '') THEN @LastName ELSE LastName END,
                Gender = CASE WHEN (Gender IS NULL OR LTRIM(RTRIM(Gender)) = '') THEN @Gender ELSE Gender END,
                DateOfBirth = CASE WHEN DateOfBirth IS NULL THEN @DateOfBirth ELSE DateOfBirth END,
                CellPhone = CASE WHEN (CellPhone IS NULL OR LTRIM(RTRIM(CellPhone)) = '') THEN @CellPhone ELSE CellPhone END,
                Email = CASE WHEN (Email IS NULL OR LTRIM(RTRIM(Email)) = '') THEN @Email ELSE Email END
            WHERE PersonId = @PersonId;
        END
        ELSE
        BEGIN
            -- אדם חדש
            INSERT INTO Person (NationalId, FirstName, LastName, Gender, DateOfBirth, CellPhone, Email)
            VALUES (@NationalId, @FirstName, @LastName, @Gender, @DateOfBirth, @CellPhone, @Email);

            SET @PersonId = SCOPE_IDENTITY();
        END

        INSERT INTO SystemUser (SystemUserId, Username, PasswordHash, PasswordSalt)
        VALUES (@PersonId, @Username, @PasswordHash, @PasswordSalt);

        INSERT INTO PersonRanch (PersonId, RanchId)
        SELECT DISTINCT @PersonId, rr.RanchId
        FROM @RanchRoles rr
        WHERE NOT EXISTS (
            SELECT 1
            FROM PersonRanch pr
            WHERE pr.PersonId = @PersonId
              AND pr.RanchId = rr.RanchId
        );

        INSERT INTO PersonRanchRole (PersonId, RanchId, RoleId, RoleStatus)
        SELECT @PersonId, rr.RanchId, rr.RoleId, 'Pending'
        FROM @RanchRoles rr
        WHERE NOT EXISTS (
            SELECT 1
            FROM PersonRanchRole prr
            WHERE prr.PersonId = @PersonId
              AND prr.RanchId = rr.RanchId
              AND prr.RoleId = rr.RoleId
        );

        COMMIT TRANSACTION;

        SELECT @PersonId AS NewPersonId;

    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO


/* =========================
   3. LOGIN
   ========================= */

   CREATE OR ALTER PROCEDURE usp_GetSystemUserForLogin
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


CREATE OR ALTER PROCEDURE usp_GetApprovedPersonRanchesAndRoles
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


/* =========================
   4. PASSWORD MANAGEMENT
   ========================= */

   CREATE OR ALTER PROCEDURE usp_UpdateSystemUserPassword
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


/* =========================
   5. LOOKUPS
   ========================= */

CREATE OR ALTER PROCEDURE usp_GetAllRoles
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        RoleId, 
        RoleName 
    FROM Role
    ORDER BY RoleName;
END
GO


CREATE OR ALTER PROCEDURE usp_GetAllRanchesNames
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        RanchId, 
        RanchName
    FROM Ranch;
END
GO