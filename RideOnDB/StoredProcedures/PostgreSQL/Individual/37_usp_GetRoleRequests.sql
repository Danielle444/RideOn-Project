CREATE OR REPLACE FUNCTION usp_GetRoleRequests(
    p_RoleId     SMALLINT,
    p_RoleStatus TEXT DEFAULT NULL,
    p_SearchText TEXT DEFAULT NULL
)
RETURNS TABLE(
    "PersonId"   INTEGER,
    "RanchId"    INTEGER,
    "RoleId"     SMALLINT,
    "FullName"   TEXT,
    "NationalId" TEXT,
    "Email"      TEXT,
    "CellPhone"  TEXT,
    "RanchName"  TEXT,
    "RoleName"   TEXT,
    "RoleStatus" TEXT
)
LANGUAGE plpgsql AS $$
BEGIN
    IF p_RoleStatus IS NOT NULL AND p_RoleStatus NOT IN ('Pending', 'Approved', 'Rejected') THEN
        RAISE EXCEPTION 'Invalid RoleStatus. Allowed: Pending, Approved, Rejected.';
    END IF;

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
        rl.rolename,
        prr.rolestatus
    FROM personranchrole prr
    INNER JOIN person p ON prr.personid = p.personid
    INNER JOIN ranch  r ON prr.ranchid  = r.ranchid
    INNER JOIN role  rl ON prr.roleid   = rl.roleid
    WHERE prr.roleid = p_RoleId
      AND (p_RoleStatus IS NULL OR prr.rolestatus = p_RoleStatus)
      AND (
            p_SearchText IS NULL OR TRIM(p_SearchText) = ''
            OR (p.firstname || ' ' || p.lastname) ILIKE '%' || p_SearchText || '%'
            OR p.nationalid ILIKE '%' || p_SearchText || '%'
            OR COALESCE(p.email, '') ILIKE '%' || p_SearchText || '%'
            OR COALESCE(p.cellphone, '') ILIKE '%' || p_SearchText || '%'
            OR r.ranchname ILIKE '%' || p_SearchText || '%'
          )
    ORDER BY
        CASE prr.rolestatus
            WHEN 'Pending'  THEN 1
            WHEN 'Approved' THEN 2
            WHEN 'Rejected' THEN 3
            ELSE 4
        END,
        p.firstname, p.lastname;
END;
$$;
