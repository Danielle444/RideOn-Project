CREATE OR REPLACE FUNCTION usp_UpdateSystemUserPassword(
    p_SystemUserId   INTEGER,
    p_NewPasswordHash TEXT,
    p_NewPasswordSalt TEXT
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE systemuser
    SET
        passwordhash       = p_NewPasswordHash,
        passwordsalt       = p_NewPasswordSalt,
        mustchangepassword = FALSE
    WHERE systemuserid = p_SystemUserId
      AND isactive     = TRUE;
END;
$$;
