CREATE OR REPLACE FUNCTION usp_GetValidRegistrationToken(
    p_tokenhash TEXT
)
RETURNS TABLE(
    "TokenId"  INTEGER,
    "PersonId" INTEGER
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT rt.tokenid, rt.personid
    FROM public.registrationtoken rt
    WHERE rt.tokenhash = p_tokenhash
      AND rt.isused = FALSE
      AND rt.expiresat > NOW()
    LIMIT 1;
END;
$$;
