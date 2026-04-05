CREATE OR REPLACE FUNCTION usp_AssignPersonRoleAtRanch(
    "PersonId"   INTEGER,
    "RanchId"    INTEGER,
    "RoleId"     SMALLINT,
    "RoleStatus" TEXT DEFAULT 'Pending'
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    IF "RoleStatus" NOT IN ('Pending', 'Approved', 'Rejected') THEN
        RAISE EXCEPTION 'Invalid RoleStatus';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM person p WHERE p.personid = "PersonId") THEN
        RAISE EXCEPTION 'Person does not exist';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM ranch r WHERE r.ranchid = "RanchId") THEN
        RAISE EXCEPTION 'Ranch does not exist';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM role r WHERE r.roleid = "RoleId") THEN
        RAISE EXCEPTION 'Role does not exist';
    END IF;

    INSERT INTO personranch (personid, ranchid) VALUES ("PersonId", "RanchId")
    ON CONFLICT DO NOTHING;

    IF NOT EXISTS (
        SELECT 1 FROM personranchrole prr
        WHERE prr.personid = "PersonId" AND prr.ranchid = "RanchId" AND prr.roleid = "RoleId"
    ) THEN
        INSERT INTO personranchrole (personid, ranchid, roleid, rolestatus)
        VALUES ("PersonId", "RanchId", "RoleId", "RoleStatus");
    ELSE
        UPDATE personranchrole SET rolestatus = "RoleStatus"
        WHERE personid = "PersonId" AND ranchid = "RanchId" AND roleid = "RoleId";
    END IF;
END;
$$;
