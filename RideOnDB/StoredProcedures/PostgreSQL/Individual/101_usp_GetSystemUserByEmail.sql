CREATE OR REPLACE FUNCTION usp_GetSystemUserByEmail(
    p_email TEXT
)
RETURNS TABLE(
    "SystemUserId" INTEGER,
    "Username"     VARCHAR,
    "IsActive"     BOOLEAN
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT su.systemuserid, su.username, su.isactive
    FROM public.systemuser su
    INNER JOIN public.person p ON p.personid = su.systemuserid
    WHERE p.email = p_email
    LIMIT 1;
END;
$$;
