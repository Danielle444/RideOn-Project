DROP FUNCTION IF EXISTS usp_GetValidPasswordResetToken CASCADE;
CREATE OR REPLACE FUNCTION usp_GetValidPasswordResetToken(
    p_tokenhash TEXT
)
RETURNS TABLE(
    "TokenId"      INTEGER,
    "SystemUserId" INTEGER
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT tokenid, systemuserid
    FROM public.passwordresettoken
    WHERE tokenhash = p_tokenhash
      AND isused = false
      AND expiresat > now()
    LIMIT 1;
END;
$$;
