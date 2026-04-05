CREATE OR REPLACE FUNCTION usp_UpdatePersonRoleStatus(
    "PersonId"   INTEGER,
    "RanchId"    INTEGER,
    "RoleId"     SMALLINT,
    "RoleStatus" TEXT
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    IF "RoleStatus" NOT IN ('Pending', 'Approved', 'Rejected') THEN
        RAISE EXCEPTION 'Invalid RoleStatus';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM personranchrole prr
        WHERE prr.personid = "PersonId" AND prr.ranchid = "RanchId" AND prr.roleid = "RoleId"
    ) THEN
        RAISE EXCEPTION 'PersonRanchRole does not exist';
    END IF;

    UPDATE personranchrole SET rolestatus = "RoleStatus"
    WHERE personid = "PersonId" AND ranchid = "RanchId" AND roleid = "RoleId";
END;
$$;
