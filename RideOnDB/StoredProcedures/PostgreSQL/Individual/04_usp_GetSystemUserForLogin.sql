CREATE OR REPLACE FUNCTION usp_GetSystemUserForLogin(
    p_Username TEXT
)
RETURNS TABLE(
    "SystemUserId"       INTEGER,
    "Username"           TEXT,
    "PasswordHash"       TEXT,
    "PasswordSalt"       TEXT,
    "IsActive"           BOOLEAN,
    "MustChangePassword" BOOLEAN,
    "CreatedDate"        TIMESTAMPTZ,
    "FirstName"          TEXT,
    "LastName"           TEXT
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT
        su.systemuserid,
        su.username,
        su.passwordhash,
        su.passwordsalt,
        su.isactive,
        su.mustchangepassword,
        su.createddate,
        p.firstname,
        p.lastname
    FROM systemuser su
    INNER JOIN person p ON su.systemuserid = p.personid
    WHERE su.username = p_Username;
END;
$$;
