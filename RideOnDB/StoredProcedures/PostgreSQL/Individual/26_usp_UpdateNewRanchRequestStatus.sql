CREATE OR REPLACE FUNCTION usp_UpdateNewRanchRequestStatus(
    "RequestId"            INTEGER,
    "ResolvedBySuperUserId" INTEGER,
    "NewStatus"            TEXT
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE newranchrequest SET
        requeststatus         = "NewStatus",
        resolvedbysuperuserid = "ResolvedBySuperUserId",
        resolveddate          = NOW()
    WHERE requestid = "RequestId";

    UPDATE ranch r SET
        ranchstatus = "NewStatus"
    FROM newranchrequest nrr
    WHERE r.ranchid = nrr.ranchid
      AND nrr.requestid = "RequestId";
END;
$$;
