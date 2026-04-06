CREATE OR REPLACE FUNCTION usp_UpdatePersonRoleStatus(
    p_PersonId   INTEGER,
    p_RanchId    INTEGER,
    p_RoleId     SMALLINT,
    p_RoleStatus TEXT
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    IF p_RoleStatus NOT IN ('Pending', 'Approved', 'Rejected') THEN
        RAISE EXCEPTION 'Invalid RoleStatus';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM personranchrole prr
        WHERE prr.personid = p_PersonId AND prr.ranchid = p_RanchId AND prr.roleid = p_RoleId
    ) THEN
        RAISE EXCEPTION 'PersonRanchRole does not exist';
    END IF;

    UPDATE personranchrole SET rolestatus = p_RoleStatus
    WHERE personid = p_PersonId AND ranchid = p_RanchId AND roleid = p_RoleId;
END;
$$;
