CREATE OR REPLACE FUNCTION usp_UpdateSuperUserLastLogin(
    p_SuperUserId INTEGER
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE superuser SET lastlogindate = NOW()
    WHERE superuserid = p_SuperUserId;
END;
$$;
