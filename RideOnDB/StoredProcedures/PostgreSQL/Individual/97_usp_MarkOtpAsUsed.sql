DROP FUNCTION IF EXISTS usp_MarkOtpAsUsed CASCADE;
CREATE OR REPLACE FUNCTION usp_MarkOtpAsUsed(
    p_otpid INTEGER
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE public.emailotp
    SET isused = true
    WHERE otpid = p_otpid;
END;
$$;
