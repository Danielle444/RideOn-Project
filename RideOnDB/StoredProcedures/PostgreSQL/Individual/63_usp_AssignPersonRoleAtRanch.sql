CREATE OR REPLACE FUNCTION usp_AssignPersonRoleAtRanch(
    p_PersonId   INTEGER,
    p_RanchId    INTEGER,
    p_RoleId     SMALLINT,
    p_RoleStatus TEXT DEFAULT 'Pending'
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    IF p_RoleStatus NOT IN ('Pending', 'Approved', 'Rejected') THEN
        RAISE EXCEPTION 'Invalid RoleStatus';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM person p WHERE p.personid = p_PersonId) THEN
        RAISE EXCEPTION 'Person does not exist';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM ranch r WHERE r.ranchid = p_RanchId) THEN
        RAISE EXCEPTION 'Ranch does not exist';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM role r WHERE r.roleid = p_RoleId) THEN
        RAISE EXCEPTION 'Role does not exist';
    END IF;

    INSERT INTO personranch (personid, ranchid) VALUES (p_PersonId, p_RanchId)
    ON CONFLICT DO NOTHING;

    IF NOT EXISTS (
        SELECT 1 FROM personranchrole prr
        WHERE prr.personid = p_PersonId AND prr.ranchid = p_RanchId AND prr.roleid = p_RoleId
    ) THEN
        INSERT INTO personranchrole (personid, ranchid, roleid, rolestatus)
        VALUES (p_PersonId, p_RanchId, p_RoleId, p_RoleStatus);
    ELSE
        UPDATE personranchrole SET rolestatus = p_RoleStatus
        WHERE personid = p_PersonId AND ranchid = p_RanchId AND roleid = p_RoleId;
    END IF;
END;
$$;
