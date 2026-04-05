CREATE OR REPLACE FUNCTION usp_InsertNewRanchRequest(
    "RanchId"                 INTEGER,
    "SubmittedBySystemUserId" INTEGER
)
RETURNS TABLE("NewRequestId" INTEGER)
LANGUAGE plpgsql AS $$
DECLARE
    v_new_id INTEGER;
BEGIN
    INSERT INTO newranchrequest (ranchid, submittedbysystemuserid)
    VALUES ("RanchId", "SubmittedBySystemUserId")
    RETURNING requestid INTO v_new_id;

    RETURN QUERY SELECT v_new_id AS "NewRequestId";
END;
$$;
