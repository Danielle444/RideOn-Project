CREATE OR REPLACE FUNCTION usp_InsertPerson(
    p_NationalId  TEXT,
    p_FirstName   TEXT,
    p_LastName    TEXT,
    p_Gender      TEXT,
    p_DateOfBirth DATE,
    p_CellPhone   TEXT,
    p_Email       TEXT
)
RETURNS TABLE("NewPersonId" INTEGER)
LANGUAGE plpgsql AS $$
DECLARE
    v_new_id INTEGER;
BEGIN
    INSERT INTO person (nationalid, firstname, lastname, gender, dateofbirth, cellphone, email)
    VALUES (p_NationalId, p_FirstName, p_LastName, p_Gender, p_DateOfBirth, p_CellPhone, p_Email)
    RETURNING personid INTO v_new_id;

    RETURN QUERY SELECT v_new_id AS "NewPersonId";
END;
$$;
