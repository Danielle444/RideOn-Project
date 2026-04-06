CREATE OR REPLACE FUNCTION usp_InsertSuperUser(
    p_Email              TEXT,
    p_PasswordHash       TEXT,
    p_PasswordSalt       TEXT,
    p_MustChangePassword BOOLEAN DEFAULT TRUE
)
RETURNS TABLE("NewSuperUserId" INTEGER)
LANGUAGE plpgsql AS $$
DECLARE
    v_new_id INTEGER;
BEGIN
    INSERT INTO superuser (email, passwordhash, passwordsalt, mustchangepassword)
    VALUES (p_Email, p_PasswordHash, p_PasswordSalt, p_MustChangePassword)
    RETURNING superuserid INTO v_new_id;

    RETURN QUERY SELECT v_new_id AS "NewSuperUserId";
END;
$$;
