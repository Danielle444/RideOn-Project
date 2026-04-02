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
        P.Phone AS PhoneNumber,
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



