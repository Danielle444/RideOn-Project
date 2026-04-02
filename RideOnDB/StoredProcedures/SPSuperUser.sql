CREATE PROCEDURE usp_InsertSuperUser
    @Email NVARCHAR(100),
    @PasswordHash NVARCHAR(255),
    @PasswordSalt NVARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;
    
    -- עמודות IsActive, MustChangePassword ו-CreatedDate מקבלות ערכי דיפולט מה-DB
    INSERT INTO SuperUser (Email, PasswordHash, PasswordSalt)
    VALUES (@Email, @PasswordHash, @PasswordSalt);
    
    SELECT SCOPE_IDENTITY() AS NewSuperUserId;
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
        MustChangePassword -- חשוב כדי שה-BL ידע אם להקפיץ אותו למסך "החלף סיסמה"
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
        MustChangePassword = 0 -- איפוס הדרישה להחלפת סיסמה
    WHERE SuperUserId = @SuperUserId;
END
GO
