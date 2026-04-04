CREATE OR ALTER PROCEDURE usp_InsertSuperUser
    @Email NVARCHAR(100),
    @PasswordHash NVARCHAR(255),
    @PasswordSalt NVARCHAR(255),
    @MustChangePassword BIT = 1
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO SuperUser (Email, PasswordHash, PasswordSalt, MustChangePassword)
    VALUES (@Email, @PasswordHash, @PasswordSalt, @MustChangePassword);

    SELECT SCOPE_IDENTITY() AS NewSuperUserId;
END
GO

CREATE OR ALTER PROCEDURE usp_GetAllSuperUsers
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        SuperUserId,
        Email,
        IsActive,
        MustChangePassword,
        CreatedDate,
        LastLoginDate
    FROM SuperUser
    ORDER BY CreatedDate DESC;
END
GO

CREATE PROCEDURE usp_GetSuperUserById
    @SuperUserId INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        SuperUserId,
        Email,
        PasswordHash,
        PasswordSalt,
        IsActive,
        MustChangePassword
    FROM SuperUser
    WHERE SuperUserId = @SuperUserId;
END
GO

CREATE PROCEDURE usp_GetSuperUserForLogin
    @Email NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        SuperUserId, 
        Email, 
        PasswordHash, 
        PasswordSalt, 
        IsActive,
        MustChangePassword 
    FROM SuperUser
    WHERE Email = @Email;
END
GO

CREATE PROCEDURE usp_UpdateSuperUserLastLogin
    @SuperUserId INT
AS
BEGIN
    SET NOCOUNT ON;
    
    UPDATE SuperUser
    SET LastLoginDate = SYSDATETIME()
    WHERE SuperUserId = @SuperUserId;
END
GO

CREATE PROCEDURE usp_UpdateSuperUserPassword
    @SuperUserId INT,
    @NewPasswordHash NVARCHAR(255),
    @NewPasswordSalt NVARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE SuperUser
    SET
        PasswordHash = @NewPasswordHash,
        PasswordSalt = @NewPasswordSalt,
        MustChangePassword = 0
    WHERE SuperUserId = @SuperUserId
      AND IsActive = 1;
END
GO

CREATE PROCEDURE usp_CheckSuperUserEmailExists
    @Email NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        CASE
            WHEN EXISTS (
                SELECT 1
                FROM SuperUser
                WHERE Email = @Email
            )
            THEN 1
            ELSE 0
        END AS ExistsFlag;
END
GO

CREATE OR ALTER PROCEDURE usp_GetRoleRequests
    @RoleId TINYINT,
    @RoleStatus NVARCHAR(20) = NULL,
    @SearchText NVARCHAR(100) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    -- ולידציה בסיסית לסטטוס, אם נשלח
    IF @RoleStatus IS NOT NULL
       AND @RoleStatus NOT IN ('Pending', 'Approved', 'Rejected')
    BEGIN
        THROW 50030, 'Invalid RoleStatus. Allowed values: Pending, Approved, Rejected.', 1;
    END

    SELECT 
        PRR.PersonId,
        PRR.RanchId,
        PRR.RoleId,
        P.FirstName + N' ' + P.LastName AS FullName,
        P.NationalId,
        P.Email,
        P.CellPhone,
        R.RanchName,
        RL.RoleName,
        PRR.RoleStatus
    FROM PersonRanchRole PRR
    INNER JOIN Person P
        ON PRR.PersonId = P.PersonId
    INNER JOIN Ranch R
        ON PRR.RanchId = R.RanchId
    INNER JOIN Role RL
        ON PRR.RoleId = RL.RoleId
    WHERE PRR.RoleId = @RoleId
      AND (@RoleStatus IS NULL OR PRR.RoleStatus = @RoleStatus)
      AND (
            @SearchText IS NULL
            OR LTRIM(RTRIM(@SearchText)) = ''
            OR (P.FirstName + N' ' + P.LastName) LIKE N'%' + @SearchText + N'%'
            OR P.NationalId LIKE '%' + @SearchText + '%'
            OR ISNULL(P.Email, N'') LIKE N'%' + @SearchText + N'%'
            OR ISNULL(P.CellPhone, '') LIKE '%' + @SearchText + '%'
            OR R.RanchName LIKE N'%' + @SearchText + N'%'
          )
    ORDER BY
        CASE PRR.RoleStatus
            WHEN 'Pending' THEN 1
            WHEN 'Approved' THEN 2
            WHEN 'Rejected' THEN 3
            ELSE 4
        END,
        P.FirstName,
        P.LastName;
END
GO

CREATE OR ALTER PROCEDURE usp_GetNewRanchRequests
    @RequestStatus NVARCHAR(20) = NULL,
    @SearchText NVARCHAR(100) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    -- ולידציה בסיסית לסטטוס, אם נשלח
    IF @RequestStatus IS NOT NULL
       AND @RequestStatus NOT IN ('Pending', 'Approved', 'Rejected')
    BEGIN
        THROW 50031, 'Invalid RequestStatus. Allowed values: Pending, Approved, Rejected.', 1;
    END

    SELECT 
        NRR.RequestId,
        NRR.RanchId,
        NRR.SubmittedBySystemUserId,
        NRR.RequestDate,
        R.RanchName,
        P.PersonId,
        P.FirstName + N' ' + P.LastName AS FullName,
        P.NationalId,
        P.Email,
        P.CellPhone,
        NRR.RequestStatus,
        NRR.ResolvedBySuperUserId,
        SU.Email AS ResolvedBySuperUserEmail,
        NRR.ResolvedDate
    FROM NewRanchRequest NRR
    INNER JOIN Ranch R
        ON NRR.RanchId = R.RanchId
    INNER JOIN SystemUser SYSU
        ON NRR.SubmittedBySystemUserId = SYSU.SystemUserId
    INNER JOIN Person P
        ON SYSU.SystemUserId = P.PersonId
    LEFT JOIN SuperUser SU
        ON NRR.ResolvedBySuperUserId = SU.SuperUserId
    WHERE (@RequestStatus IS NULL OR NRR.RequestStatus = @RequestStatus)
      AND (
            @SearchText IS NULL
            OR LTRIM(RTRIM(@SearchText)) = ''
            OR R.RanchName LIKE N'%' + @SearchText + N'%'
            OR (P.FirstName + N' ' + P.LastName) LIKE N'%' + @SearchText + N'%'
            OR P.NationalId LIKE '%' + @SearchText + '%'
            OR ISNULL(P.Email, N'') LIKE N'%' + @SearchText + N'%'
            OR ISNULL(P.CellPhone, '') LIKE '%' + @SearchText + '%'
          )
    ORDER BY
        CASE NRR.RequestStatus
            WHEN 'Pending' THEN 1
            WHEN 'Approved' THEN 2
            WHEN 'Rejected' THEN 3
            ELSE 4
        END,
        NRR.RequestDate DESC;
END
GO

