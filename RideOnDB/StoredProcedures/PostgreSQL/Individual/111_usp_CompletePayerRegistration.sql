-- מסמן את הטוקן כמשומש, מעדכן סיסמה, ומסמן הרשמה כהושלמה
CREATE OR REPLACE FUNCTION usp_CompletePayerRegistration(
    p_tokenid      INTEGER,
    p_personid     INTEGER,
    p_passwordhash TEXT,
    p_passwordsalt TEXT,
    p_firstname    TEXT DEFAULT NULL,
    p_lastname     TEXT DEFAULT NULL,
    p_cellphone    TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    -- סימון טוקן כמשומש
    UPDATE public.registrationtoken
    SET isused = TRUE
    WHERE tokenid = p_tokenid;

    -- עדכון סיסמה + סימון הרשמה הושלמה
    UPDATE public.systemuser
    SET passwordhash          = p_passwordhash,
        passwordsalt          = p_passwordsalt,
        mustchangepassword    = FALSE,
        registrationcompleted = TRUE
    WHERE systemuserid = p_personid;

    -- עדכון פרטים אישיים אם סופקו
    UPDATE public.person
    SET firstname = COALESCE(NULLIF(TRIM(p_firstname), ''), firstname),
        lastname  = COALESCE(NULLIF(TRIM(p_lastname),  ''), lastname),
        cellphone = COALESCE(NULLIF(TRIM(p_cellphone), ''), cellphone)
    WHERE personid = p_personid;
END;
$$;
