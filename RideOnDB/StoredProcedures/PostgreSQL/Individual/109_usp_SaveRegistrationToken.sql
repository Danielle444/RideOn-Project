CREATE OR REPLACE FUNCTION usp_SaveRegistrationToken(
    p_personid   INTEGER,
    p_tokenhash  TEXT,
    p_expiresat  TIMESTAMP WITH TIME ZONE
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO public.registrationtoken (personid, tokenhash, expiresat)
    VALUES (p_personid, p_tokenhash, p_expiresat);
END;
$$;
