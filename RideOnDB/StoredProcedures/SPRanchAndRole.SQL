USE RideOn;
GO


GO

CREATE PROCEDURE usp_InsertRanch
    @RanchName NVARCHAR(100),
    @ContactEmail NVARCHAR(254) = NULL,
    @ContactPhone VARCHAR(20) = NULL,
    @WebsiteUrl NVARCHAR(255) = NULL,
    @Lat FLOAT = NULL,
    @Long FLOAT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @Geog GEOGRAPHY = NULL;
    IF @Lat IS NOT NULL AND @Long IS NOT NULL
        SET @Geog = geography::Point(@Lat, @Long, 4326);

    INSERT INTO Ranch (RanchName, ContactEmail, ContactPhone, WebsiteUrl, Location, RanchStatus)
    VALUES (@RanchName, @ContactEmail, @ContactPhone, @WebsiteUrl, @Geog, 'Pending');
    
    SELECT SCOPE_IDENTITY() AS NewRanchId;
END
GO


CREATE PROCEDURE usp_InsertNewRanchRequest
    @RanchId INT,
    @SubmittedBySystemUserId INT
AS
BEGIN
    SET NOCOUNT ON;
    
    INSERT INTO NewRanchRequest (RanchId, SubmittedBySystemUserId)
    VALUES (@RanchId, @SubmittedBySystemUserId);
    
    SELECT SCOPE_IDENTITY() AS NewRequestId;
END
GO

CREATE PROCEDURE usp_UpdateNewRanchRequestStatus
    @RequestId INT,
    @ResolvedBySuperUserId INT,
    @NewStatus NVARCHAR(20) -- 'Approved' / 'Rejected'
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRANSACTION;
    BEGIN TRY
        -- 1. עדכון טבלת הבקשות
        UPDATE NewRanchRequest
        SET 
            RequestStatus = @NewStatus,
            ResolvedBySuperUserId = @ResolvedBySuperUserId,
            ResolvedDate = SYSDATETIME()
        WHERE RequestId = @RequestId;

        -- 2. עדכון טבלת החווה בהתאם
        -- שולפים את ה-RanchId מהבקשה ומעדכנים את הסטטוס שלו
        UPDATE R
        SET R.RanchStatus = @NewStatus
        FROM Ranch R
        INNER JOIN NewRanchRequest NRR ON R.RanchId = NRR.RanchId
        WHERE NRR.RequestId = @RequestId;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        THROW;
    END CATCH
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

CREATE PROCEDURE usp_GetAllRanchesNames
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        RanchId, 
        RanchName
    FROM Ranch
    WHERE RanchStatus = 'Approved' -- הסינון הקריטי שהוספנו
    ORDER BY RanchName ASC;        -- סידור אלפביתי לחווית משתמש טובה יותר
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
        R.RanchName, 
        R.ContactEmail, 
        R.ContactPhone, 
        R.WebsiteUrl,
        R.Location.Lat AS Latitude,
        R.Location.Long AS Longitude
    FROM Ranch R
    INNER JOIN PersonRanch PR ON R.RanchId = PR.RanchId
    WHERE PR.PersonId = @UserId
      -- רק חוות שאושרו יוצגו למשתמש הרגיל
      AND R.RanchStatus = 'Approved';
END
GO

