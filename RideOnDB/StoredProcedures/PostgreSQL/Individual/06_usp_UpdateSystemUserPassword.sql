CREATE OR REPLACE FUNCTION usp_UpdateSystemUserPassword(
    "SystemUserId"   INTEGER,
    "NewPasswordHash" TEXT,
    "NewPasswordSalt" TEXT
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE systemuser
    SET
        passwordhash       = "NewPasswordHash",
        passwordsalt       = "NewPasswordSalt",
        mustchangepassword = FALSE
    WHERE systemuserid = "SystemUserId"
      AND isactive     = TRUE;
END;
$$;
