CREATE OR REPLACE FUNCTION usp_GetSystemUserForLogin(
    username_param TEXT
)
RETURNS TABLE(
    "SystemUserId"       INTEGER,
    "Username"           VARCHAR,
    "PasswordHash"       VARCHAR,
    "PasswordSalt"       VARCHAR,
    "IsActive"           BOOLEAN,
    "MustChangePassword" BOOLEAN,
    "CreatedDate"        TIMESTAMPTZ,
    "FirstName"          VARCHAR,
    "LastName"           VARCHAR
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
    WHERE LOWER(su.username) = LOWER(username_param);
END;
$$;
