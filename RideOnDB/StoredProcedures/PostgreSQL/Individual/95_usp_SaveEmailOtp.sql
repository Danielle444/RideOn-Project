CREATE OR REPLACE FUNCTION usp_SaveEmailOtp(
    p_email     TEXT,
    p_otphash   TEXT,
    p_expiresat TIMESTAMP WITH TIME ZONE
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO public.emailotp (email, otphash, expiresat)
    VALUES (p_email, p_otphash, p_expiresat);
END;
$$;
