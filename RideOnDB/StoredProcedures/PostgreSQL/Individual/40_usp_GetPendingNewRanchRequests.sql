CREATE OR REPLACE FUNCTION usp_GetPendingNewRanchRequests()
RETURNS TABLE(
    "RequestId"     INTEGER,
    "RequestDate"   TIMESTAMP,
    "RanchName"     TEXT,
    "FullName"      TEXT,
    "NationalId"    TEXT,
    "Email"         TEXT,
    "RequestStatus" TEXT
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT
        nrr.requestid,
        nrr.requestdate,
        r.ranchname,
        (p.firstname || ' ' || p.lastname),
        p.nationalid,
        p.email,
        nrr.requeststatus
    FROM newranchrequest nrr
    INNER JOIN ranch  r ON nrr.ranchid = r.ranchid
    INNER JOIN person p ON nrr.submittedbysystemuserid = p.personid
    WHERE nrr.requeststatus = 'Pending'
    ORDER BY nrr.requestdate ASC;
END;
$$;
