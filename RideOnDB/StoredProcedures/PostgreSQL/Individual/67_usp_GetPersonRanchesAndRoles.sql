CREATE OR REPLACE FUNCTION usp_GetPersonRanchesAndRoles(
    p_PersonId INTEGER
)
RETURNS TABLE(
    "RanchId"    INTEGER,
    "RanchName"  TEXT,
    "RoleId"     SMALLINT,
    "RoleName"   TEXT,
    "RoleStatus" TEXT
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT prr.ranchid, r.ranchname, prr.roleid, rl.rolename, prr.rolestatus
    FROM personranchrole prr
    INNER JOIN ranch r  ON prr.ranchid = r.ranchid
    INNER JOIN role  rl ON prr.roleid  = rl.roleid
    WHERE prr.personid = p_PersonId;
END;
$$;
