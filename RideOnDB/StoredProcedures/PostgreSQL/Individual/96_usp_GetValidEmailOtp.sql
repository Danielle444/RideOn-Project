CREATE OR REPLACE FUNCTION usp_GetValidEmailOtp(
    p_email TEXT
)
RETURNS TABLE(
    "OtpId"     INTEGER,
    "OtpHash"   VARCHAR,
    "ExpiresAt" TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT otpid, otphash, expiresat
    FROM public.emailotp
    WHERE email = p_email
      AND isused = false
      AND expiresat > now()
    ORDER BY createdat DESC
    LIMIT 1;
END;
$$;
