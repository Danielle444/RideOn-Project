CREATE OR REPLACE FUNCTION usp_InsertNewRanchRequest(
    p_RanchId                 INTEGER,
    p_SubmittedBySystemUserId INTEGER
)
RETURNS TABLE("NewRequestId" INTEGER)
LANGUAGE plpgsql AS $$
DECLARE
    v_new_id INTEGER;
BEGIN
    INSERT INTO newranchrequest (ranchid, submittedbysystemuserid)
    VALUES (p_RanchId, p_SubmittedBySystemUserId)
    RETURNING requestid INTO v_new_id;

    RETURN QUERY SELECT v_new_id AS "NewRequestId";
END;
$$;
