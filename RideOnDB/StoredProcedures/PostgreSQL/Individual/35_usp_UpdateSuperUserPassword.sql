CREATE OR REPLACE FUNCTION usp_UpdateSuperUserPassword(
    "SuperUserId"    INTEGER,
    "NewPasswordHash" TEXT,
    "NewPasswordSalt" TEXT
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE superuser SET
        passwordhash       = "NewPasswordHash",
        passwordsalt       = "NewPasswordSalt",
        mustchangepassword = FALSE
    WHERE superuserid = "SuperUserId"
      AND isactive    = TRUE;
END;
$$;
