DROP FUNCTION IF EXISTS usp_MarkResetTokenAsUsed CASCADE;
CREATE OR REPLACE FUNCTION usp_MarkResetTokenAsUsed(
    p_tokenid INTEGER
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE public.passwordresettoken
    SET isused = true
    WHERE tokenid = p_tokenid;
END;
$$;
