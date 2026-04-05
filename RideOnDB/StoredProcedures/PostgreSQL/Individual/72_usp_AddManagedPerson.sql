CREATE OR REPLACE FUNCTION usp_AddManagedPerson(
    "SystemUserId"   INTEGER,
    "PersonId"       INTEGER,
    "ApprovalStatus" TEXT DEFAULT 'Pending'
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO personmanagedbysystemuser (systemuserid, personid, requestdate, approvalstatus)
    VALUES ("SystemUserId", "PersonId", NOW(), "ApprovalStatus");
END;
$$;
