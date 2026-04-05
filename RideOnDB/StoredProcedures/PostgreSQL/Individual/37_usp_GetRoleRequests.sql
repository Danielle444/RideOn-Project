CREATE OR REPLACE FUNCTION usp_GetRoleRequests(
    RoleId     SMALLINT,
    RoleStatus TEXT DEFAULT NULL,
    "SearchText" TEXT DEFAULT NULL
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
    IF RoleStatus IS NOT NULL AND RoleStatus NOT IN ('Pending', 'Approved', 'Rejected') THEN
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
    WHERE prr.roleid = RoleId
      AND (RoleStatus IS NULL OR prr.rolestatus = RoleStatus)
      AND (
            "SearchText" IS NULL OR TRIM("SearchText") = ''
            OR (p.firstname || ' ' || p.lastname) ILIKE '%' || "SearchText" || '%'
            OR p.nationalid ILIKE '%' || "SearchText" || '%'
            OR COALESCE(p.email, '') ILIKE '%' || "SearchText" || '%'
            OR COALESCE(p.cellphone, '') ILIKE '%' || "SearchText" || '%'
            OR r.ranchname ILIKE '%' || "SearchText" || '%'
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
