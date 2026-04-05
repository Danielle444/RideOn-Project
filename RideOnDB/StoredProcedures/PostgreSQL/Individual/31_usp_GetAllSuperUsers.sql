CREATE OR REPLACE FUNCTION usp_GetAllSuperUsers()
RETURNS TABLE(
    "SuperUserId"        INTEGER,
    "Email"              TEXT,
    "IsActive"           BOOLEAN,
    "MustChangePassword" BOOLEAN,
    "CreatedDate"        TIMESTAMP,
    "LastLoginDate"      TIMESTAMP
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT su.superuserid, su.email, su.isactive, su.mustchangepassword,
           su.createddate, su.lastlogindate
    FROM superuser su
    ORDER BY su.createddate DESC;
END;
$$;
