USE RideOn;
GO


GO

CREATE PROCEDURE usp_InsertRanch
    @RanchName NVARCHAR(100),
    @ContactEmail NVARCHAR(254) = NULL,
    @ContactPhone VARCHAR(20) = NULL,
    @WebsiteUrl NVARCHAR(255) = NULL,
    @Latitude FLOAT = NULL,  -- מגיע מה-DAL כטיפוס Double
    @Longitude FLOAT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @Location GEOGRAPHY = NULL;
    
    -- המרה רק אם קיבלנו קואורדינטות תקינות
    IF @Latitude IS NOT NULL AND @Longitude IS NOT NULL
    BEGIN
        SET @Location = GEOGRAPHY::Point(@Latitude, @Longitude, 4326);
    END

    INSERT INTO Ranch (RanchName, ContactEmail, ContactPhone, WebsiteUrl, Location)
    VALUES (@RanchName, @ContactEmail, @ContactPhone, @WebsiteUrl, @Location);
    
    SELECT SCOPE_IDENTITY() AS NewRanchId;
END
GO

CREATE PROCEDURE usp_UpdateRanch
    @RanchId INT,
    @RanchName NVARCHAR(100),
    @ContactEmail NVARCHAR(254) = NULL,
    @ContactPhone VARCHAR(20) = NULL,
    @WebsiteUrl NVARCHAR(255) = NULL,
    @Latitude FLOAT = NULL,
    @Longitude FLOAT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @Location GEOGRAPHY = NULL;
    
    IF @Latitude IS NOT NULL AND @Longitude IS NOT NULL
    BEGIN
        SET @Location = GEOGRAPHY::Point(@Latitude, @Longitude, 4326);
    END

    UPDATE Ranch
    SET 
        RanchName = @RanchName,
        ContactEmail = @ContactEmail,
        ContactPhone = @ContactPhone,
        WebsiteUrl = @WebsiteUrl,
        Location = @Location
    WHERE RanchId = @RanchId;
END
GO


CREATE PROCEDURE usp_GetRanchById
    @RanchId INT
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        RanchId, 
        RanchName, 
        ContactEmail, 
        ContactPhone, 
        WebsiteUrl,
        Location.Lat AS Latitude,
        Location.Long AS Longitude
    FROM Ranch
    WHERE RanchId = @RanchId;
END
GO

CREATE PROCEDURE usp_GetAllRanchesByUserId
    @UserId INT
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        R.RanchId, 
        R.RanchName
    FROM Ranch R
    INNER JOIN PersonRanch PR ON R.RanchId = PR.RanchId
    WHERE PR.PersonId = @UserId;
END
GO

