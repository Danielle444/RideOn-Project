CREATE OR REPLACE FUNCTION usp_AddManagedPerson(
    p_SystemUserId   INTEGER,
    p_PersonId       INTEGER,
    p_ApprovalStatus TEXT DEFAULT 'Pending'
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO personmanagedbysystemuser (systemuserid, personid, requestdate, approvalstatus)
    VALUES (p_SystemUserId, p_PersonId, NOW(), p_ApprovalStatus);
END;
$$;
