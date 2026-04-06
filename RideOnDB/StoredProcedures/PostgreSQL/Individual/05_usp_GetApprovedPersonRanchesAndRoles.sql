CREATE OR REPLACE FUNCTION usp_GetApprovedPersonRanchesAndRoles(
    p_PersonId INTEGER
)
RETURNS TABLE(
    "RanchId"   INTEGER,
    "RanchName" TEXT,
    "RoleId"    SMALLINT,
    "RoleName"  TEXT
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT
        prr.ranchid,
        r.ranchname,
        prr.roleid,
        rl.rolename
    FROM personranchrole prr
    INNER JOIN ranch r  ON prr.ranchid = r.ranchid
    INNER JOIN role  rl ON prr.roleid  = rl.roleid
    WHERE prr.personid   = p_PersonId
      AND prr.rolestatus = 'Approved';
END;
$$;
