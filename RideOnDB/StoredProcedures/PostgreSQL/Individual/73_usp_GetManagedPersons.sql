CREATE OR REPLACE FUNCTION usp_GetManagedPersons(
    p_SystemUserId INTEGER
)
RETURNS TABLE(
    "PersonId"       INTEGER,
    "FirstName"      TEXT,
    "LastName"       TEXT,
    "NationalId"     TEXT,
    "RequestDate"    TIMESTAMPTZ,
    "ApprovalStatus" TEXT
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT m.personid, p.firstname, p.lastname, p.nationalid, m.requestdate, m.approvalstatus
    FROM personmanagedbysystemuser m
    INNER JOIN person p ON m.personid = p.personid
    WHERE m.systemuserid = p_SystemUserId;
END;
$$;
