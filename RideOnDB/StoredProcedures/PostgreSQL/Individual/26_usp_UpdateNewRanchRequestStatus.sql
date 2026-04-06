CREATE OR REPLACE FUNCTION usp_UpdateNewRanchRequestStatus(
    p_RequestId            INTEGER,
    p_ResolvedBySuperUserId INTEGER,
    p_NewStatus            TEXT
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE newranchrequest SET
        requeststatus         = p_NewStatus,
        resolvedbysuperuserid = p_ResolvedBySuperUserId,
        resolveddate          = NOW()
    WHERE requestid = p_RequestId;

    UPDATE ranch r SET
        ranchstatus = p_NewStatus
    FROM newranchrequest nrr
    WHERE r.ranchid = nrr.ranchid
      AND nrr.requestid = p_RequestId;
END;
$$;
