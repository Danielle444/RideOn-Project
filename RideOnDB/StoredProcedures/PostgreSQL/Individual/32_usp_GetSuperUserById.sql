CREATE OR REPLACE FUNCTION usp_GetSuperUserById(
    p_SuperUserId INTEGER
)
RETURNS TABLE(
    "SuperUserId"        INTEGER,
    "Email"              TEXT,
    "PasswordHash"       TEXT,
    "PasswordSalt"       TEXT,
    "IsActive"           BOOLEAN,
    "MustChangePassword" BOOLEAN
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT su.superuserid, su.email, su.passwordhash, su.passwordsalt,
           su.isactive, su.mustchangepassword
    FROM superuser su
    WHERE su.superuserid = p_SuperUserId;
END;
$$;
