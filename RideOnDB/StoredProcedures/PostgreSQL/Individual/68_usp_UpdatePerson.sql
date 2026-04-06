CREATE OR REPLACE FUNCTION usp_UpdatePerson(
    p_PersonId  INTEGER,
    p_FirstName TEXT,
    p_LastName  TEXT,
    p_Gender    TEXT,
    p_CellPhone TEXT,
    p_Email     TEXT
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE person SET
        firstname = p_FirstName,
        lastname  = p_LastName,
        gender    = p_Gender,
        cellphone = p_CellPhone,
        email     = p_Email
    WHERE personid = p_PersonId;
END;
$$;
