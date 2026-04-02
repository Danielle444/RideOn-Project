--Ranch Admin and secrotery Requests
CREATE PROCEDURE usp_GetPendingRoleRequests
    @RoleId TINYINT
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        PRR.PersonId,
        PRR.RanchId,
        PRR.RoleId,
        P.FirstName + ' ' + P.LastName AS FullName,
        -- שימי לב: ייתכן שתצטרכי להתאים את השמות של 3 העמודות הבאות לשמות המדויקים בטבלת Person שלך
        P.NationalId AS IdNumber, 
        P.Email,
        P.CellPhone AS PhoneNumber,
        R.RanchName,
        PRR.RoleStatus
    FROM PersonRanchRole PRR
    INNER JOIN Person P ON PRR.PersonId = P.PersonId
    INNER JOIN Ranch R ON PRR.RanchId = R.RanchId
    WHERE PRR.RoleStatus = 'Pending'
      AND PRR.RoleId = @RoleId
    ORDER BY P.FirstName;
END
GO

--new ranch requests
CREATE PROCEDURE usp_GetPendingNewRanchRequests
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        NRR.RequestId,
        NRR.RequestDate,
        R.RanchName,
        P.FirstName + ' ' + P.LastName AS FullName,
        P.NationalId,
        P.Phone,
        P.Email,
        NRR.RequestStatus
    FROM NewRanchRequest NRR
    INNER JOIN Ranch R ON NRR.RanchId = R.RanchId
    INNER JOIN Person P ON NRR.SubmittedBySystemUserId = P.PersonId
    WHERE NRR.RequestStatus = 'Pending'
    ORDER BY NRR.RequestDate ASC;
END
GO

CREATE PROCEDURE usp_UpdateNewRanchRequestStatus
    @RequestId INT,
    @ResolvedBySuperUserId INT,
    @NewStatus NVARCHAR(20) -- 'Approved' או 'Rejected'
AS
BEGIN
    SET NOCOUNT ON;
    
    UPDATE NewRanchRequest
    SET 
        RequestStatus = @NewStatus,
        ResolvedBySuperUserId = @ResolvedBySuperUserId,
        ResolvedDate = SYSDATETIME()
    WHERE RequestId = @RequestId;
END
GO

