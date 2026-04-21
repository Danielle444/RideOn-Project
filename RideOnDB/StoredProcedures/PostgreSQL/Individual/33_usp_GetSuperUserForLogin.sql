CREATE OR REPLACE FUNCTION usp_GetSuperUserForLogin(
    p_Email TEXT
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
    WHERE su.email = p_Email;
END;
$$;
