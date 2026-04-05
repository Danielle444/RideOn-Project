CREATE OR REPLACE FUNCTION usp_GetNewRanchRequests(
    RequestStatus TEXT DEFAULT NULL,
    "SearchText"  TEXT DEFAULT NULL
)
RETURNS TABLE(
    "RequestId"               INTEGER,
    "RanchId"                 INTEGER,
    "SubmittedBySystemUserId" INTEGER,
    "RequestDate"             TIMESTAMP,
    "RanchName"               TEXT,
    "PersonId"                INTEGER,
    "FullName"                TEXT,
    "NationalId"              TEXT,
    "Email"                   TEXT,
    "CellPhone"               TEXT,
    "RequestStatus"           TEXT,
    "ResolvedBySuperUserId"   INTEGER,
    "ResolvedBySuperUserEmail" TEXT,
    "ResolvedDate"            TIMESTAMP
)
LANGUAGE plpgsql AS $$
BEGIN
    IF RequestStatus IS NOT NULL AND RequestStatus NOT IN ('Pending', 'Approved', 'Rejected') THEN
        RAISE EXCEPTION 'Invalid RequestStatus. Allowed: Pending, Approved, Rejected.';
    END IF;

    RETURN QUERY
    SELECT
        nrr.requestid,
        nrr.ranchid,
        nrr.submittedbysystemuserid,
        nrr.requestdate,
        r.ranchname,
        p.personid,
        (p.firstname || ' ' || p.lastname),
        p.nationalid,
        p.email,
        p.cellphone,
        nrr.requeststatus,
        nrr.resolvedbysuperuserid,
        su.email,
        nrr.resolveddate
    FROM newranchrequest nrr
    INNER JOIN ranch      r    ON nrr.ranchid = r.ranchid
    INNER JOIN systemuser sysu ON nrr.submittedbysystemuserid = sysu.systemuserid
    INNER JOIN person     p    ON sysu.systemuserid = p.personid
    LEFT  JOIN superuser  su   ON nrr.resolvedbysuperuserid = su.superuserid
    WHERE (RequestStatus IS NULL OR nrr.requeststatus = RequestStatus)
      AND (
            "SearchText" IS NULL OR TRIM("SearchText") = ''
            OR r.ranchname ILIKE '%' || "SearchText" || '%'
            OR (p.firstname || ' ' || p.lastname) ILIKE '%' || "SearchText" || '%'
            OR p.nationalid ILIKE '%' || "SearchText" || '%'
            OR COALESCE(p.email, '') ILIKE '%' || "SearchText" || '%'
            OR COALESCE(p.cellphone, '') ILIKE '%' || "SearchText" || '%'
          )
    ORDER BY
        CASE nrr.requeststatus
            WHEN 'Pending'  THEN 1
            WHEN 'Approved' THEN 2
            WHEN 'Rejected' THEN 3
            ELSE 4
        END,
        nrr.requestdate DESC;
END;
$$;
