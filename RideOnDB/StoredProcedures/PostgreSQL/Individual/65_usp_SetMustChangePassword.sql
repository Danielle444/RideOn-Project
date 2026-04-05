CREATE OR REPLACE FUNCTION usp_SetMustChangePassword(
    "SystemUserId"       INTEGER,
    "MustChangePassword" BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE systemuser SET mustchangepassword = "MustChangePassword"
    WHERE systemuserid = "SystemUserId";
END;
$$;
