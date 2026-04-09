DROP FUNCTION IF EXISTS usp_SavePasswordResetToken CASCADE;
CREATE OR REPLACE FUNCTION usp_SavePasswordResetToken(
    p_systemuserid INTEGER,
    p_tokenhash    TEXT,
    p_expiresat    TIMESTAMP WITH TIME ZONE
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO public.passwordresettoken (systemuserid, tokenhash, expiresat)
    VALUES (p_systemuserid, p_tokenhash, p_expiresat);
END;
$$;
