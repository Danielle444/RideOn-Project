CREATE OR REPLACE FUNCTION usp_UpdateSuperUserLastLogin(
    "SuperUserId" INTEGER
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE superuser SET lastlogindate = NOW()
    WHERE superuserid = "SuperUserId";
END;
$$;
