CREATE OR REPLACE FUNCTION usp_InsertSuperUser(
    "Email"              TEXT,
    "PasswordHash"       TEXT,
    "PasswordSalt"       TEXT,
    "MustChangePassword" BOOLEAN DEFAULT TRUE
)
RETURNS TABLE("NewSuperUserId" INTEGER)
LANGUAGE plpgsql AS $$
DECLARE
    v_new_id INTEGER;
BEGIN
    INSERT INTO superuser (email, passwordhash, passwordsalt, mustchangepassword)
    VALUES ("Email", "PasswordHash", "PasswordSalt", "MustChangePassword")
    RETURNING superuserid INTO v_new_id;

    RETURN QUERY SELECT v_new_id AS "NewSuperUserId";
END;
$$;
