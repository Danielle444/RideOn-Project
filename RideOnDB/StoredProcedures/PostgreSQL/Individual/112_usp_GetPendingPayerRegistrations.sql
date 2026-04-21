CREATE OR REPLACE FUNCTION usp_GetPendingPayerRegistrations()
RETURNS TABLE(
    "PersonId"    INTEGER,
    "FirstName"   TEXT,
    "LastName"    TEXT,
    "Email"       TEXT,
    "CellPhone"   TEXT,
    "Username"    TEXT,
    "RanchId"     INTEGER,
    "RanchName"   TEXT,
    "RoleId"      SMALLINT,
    "RequestDate" TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT ON (p.personid)
        p.personid,
        p.firstname,
        p.lastname,
        p.email,
        p.cellphone,
        su.username,
        r.ranchid,
        r.ranchname,
        prr.roleid,
        rt.createdat
    FROM public.person p
    INNER JOIN public.systemuser su ON su.systemuserid = p.personid
    INNER JOIN public.personranchrole prr ON prr.personid = p.personid
    INNER JOIN public.ranch r ON r.ranchid = prr.ranchid
    INNER JOIN public.role ro ON ro.roleid = prr.roleid
    INNER JOIN public.registrationtoken rt ON rt.personid = p.personid AND rt.isused = TRUE
    WHERE ro.rolename = 'משלם'
      AND prr.rolestatus = 'Pending'
      AND su.registrationcompleted = TRUE
    ORDER BY p.personid, rt.createdat DESC;
END;
$$;
