CREATE OR REPLACE FUNCTION usp_UpdatePerson(
    "PersonId"  INTEGER,
    "FirstName" TEXT,
    "LastName"  TEXT,
    "Gender"    TEXT,
    "CellPhone" TEXT,
    "Email"     TEXT
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE person SET
        firstname = "FirstName",
        lastname  = "LastName",
        gender    = "Gender",
        cellphone = "CellPhone",
        email     = "Email"
    WHERE personid = "PersonId";
END;
$$;
