CREATE OR REPLACE FUNCTION usp_GetNewRanchRequests(
    p_RequestStatus TEXT DEFAULT NULL,
    p_SearchText    TEXT DEFAULT NULL
)
RETURNS TABLE(
    "RequestId"               INTEGER,
    "RanchId"                 INTEGER,
    "SubmittedBySystemUserId" INTEGER,
    "RequestDate"             TIMESTAMPTZ,
    "RanchName"               TEXT,
    "PersonId"                INTEGER,
    "FullName"                TEXT,
    "NationalId"              TEXT,
    "Email"                   TEXT,
    "CellPhone"               TEXT,
    "RequestStatus"           TEXT,
    "ResolvedBySuperUserId"   INTEGER,
    "ResolvedBySuperUserEmail" TEXT,
    "ResolvedDate"            TIMESTAMPTZ
)
LANGUAGE plpgsql AS $$
BEGIN
    IF p_RequestStatus IS NOT NULL AND p_RequestStatus NOT IN ('Pending', 'Approved', 'Rejected') THEN
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
    WHERE (p_RequestStatus IS NULL OR nrr.requeststatus = p_RequestStatus)
      AND (
            p_SearchText IS NULL OR TRIM(p_SearchText) = ''
            OR r.ranchname ILIKE '%' || p_SearchText || '%'
            OR (p.firstname || ' ' || p.lastname) ILIKE '%' || p_SearchText || '%'
            OR p.nationalid ILIKE '%' || p_SearchText || '%'
            OR COALESCE(p.email, '') ILIKE '%' || p_SearchText || '%'
            OR COALESCE(p.cellphone, '') ILIKE '%' || p_SearchText || '%'
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
