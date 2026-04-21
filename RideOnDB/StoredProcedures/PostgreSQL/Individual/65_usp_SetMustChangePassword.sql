CREATE OR REPLACE FUNCTION usp_SetMustChangePassword(
    p_SystemUserId       INTEGER,
    p_MustChangePassword BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE systemuser SET mustchangepassword = p_MustChangePassword
    WHERE systemuserid = p_SystemUserId;
END;
$$;
