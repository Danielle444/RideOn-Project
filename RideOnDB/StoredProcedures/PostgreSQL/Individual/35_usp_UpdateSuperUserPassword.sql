CREATE OR REPLACE FUNCTION usp_UpdateSuperUserPassword(
    p_SuperUserId    INTEGER,
    p_NewPasswordHash TEXT,
    p_NewPasswordSalt TEXT
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE superuser SET
        passwordhash       = p_NewPasswordHash,
        passwordsalt       = p_NewPasswordSalt,
        mustchangepassword = FALSE
    WHERE superuserid = p_SuperUserId
      AND isactive    = TRUE;
END;
$$;
