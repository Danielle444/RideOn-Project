CREATE OR REPLACE FUNCTION usp_InsertPerson(
    "NationalId"  TEXT,
    "FirstName"   TEXT,
    "LastName"    TEXT,
    "Gender"      TEXT,
    "DateOfBirth" DATE,
    "CellPhone"   TEXT,
    "Email"       TEXT
)
RETURNS TABLE("NewPersonId" INTEGER)
LANGUAGE plpgsql AS $$
DECLARE
    v_new_id INTEGER;
BEGIN
    INSERT INTO person (nationalid, firstname, lastname, gender, dateofbirth, cellphone, email)
    VALUES ("NationalId", "FirstName", "LastName", "Gender", "DateOfBirth", "CellPhone", "Email")
    RETURNING personid INTO v_new_id;

    RETURN QUERY SELECT v_new_id AS "NewPersonId";
END;
$$;
