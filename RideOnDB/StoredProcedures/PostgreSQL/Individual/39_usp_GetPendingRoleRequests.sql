CREATE OR REPLACE FUNCTION usp_GetPendingRoleRequests(
    RoleId SMALLINT
)
RETURNS TABLE(
    "PersonId"   INTEGER,
    "RanchId"    INTEGER,
    "RoleId"     SMALLINT,
    "FullName"   TEXT,
    "IdNumber"   TEXT,
    "Email"      TEXT,
    "PhoneNumber" TEXT,
    "RanchName"  TEXT,
    "RoleStatus" TEXT
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT
        prr.personid,
        prr.ranchid,
        prr.roleid,
        (p.firstname || ' ' || p.lastname),
        p.nationalid,
        p.email,
        p.cellphone,
        r.ranchname,
        prr.rolestatus
    FROM personranchrole prr
    INNER JOIN person p ON prr.personid = p.personid
    INNER JOIN ranch  r ON prr.ranchid  = r.ranchid
    WHERE prr.rolestatus = 'Pending'
      AND prr.roleid     = RoleId
    ORDER BY p.firstname;
END;
$$;
