--Ranch Admin Requests
CREATE PROCEDURE usp_InsertAdminRequest
    @SubmittedBySystemUserId INT,
    @RequestType NVARCHAR(100), 
    @RequestDescription NVARCHAR(500)
AS
BEGIN
    SET NOCOUNT ON;
    
    INSERT INTO AdminRequest (SubmittedBySystemUserId, RequestType, RequestDescription, RequestDate, Status)
    VALUES (@SubmittedBySystemUserId, @RequestType, @RequestDescription, SYSDATETIME(), 'Pending');
    
    SELECT SCOPE_IDENTITY() AS NewRequestId;
END
GO

CREATE PROCEDURE usp_GetPendingAdminRequests
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        AR.RequestId,
        AR.RequestDate,
        AR.RequestDescription,
        P.FirstName + ' ' + P.LastName AS SubmittedByName,
        AR.Status
    FROM AdminRequest AR
    INNER JOIN Person P ON AR.SubmittedBySystemUserId = P.PersonId
    WHERE AR.Status = 'Pending'
    ORDER BY AR.RequestDate ASC;
END
GO

CREATE PROCEDURE usp_UpdateAdminRequestStatus
    @RequestId INT,
    @ResolvedBySuperUserId INT, -- ה-SuperUserId של המנהל שטיפל בבקשה
    @NewStatus NVARCHAR(20)     -- 'Approved' / 'Rejected'
AS
BEGIN
    SET NOCOUNT ON;
    
    UPDATE AdminRequest
    SET 
        Status = @NewStatus,
        ResolvedBySuperUserId = @ResolvedBySuperUserId,
        ResolvedDate = SYSDATETIME()
    WHERE RequestId = @RequestId;
END
GO

-- Secrotery requsts

