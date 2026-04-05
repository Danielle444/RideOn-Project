CREATE OR REPLACE FUNCTION usp_GetPersonByNationalIdForRegistration(
    NationalId TEXT
)
RETURNS TABLE(
    "PersonId"      INTEGER,
    "NationalId"    TEXT,
    "FirstName"     TEXT,
    "LastName"      TEXT,
    "Gender"        TEXT,
    "DateOfBirth"   DATE,
    "CellPhone"     TEXT,
    "Email"         TEXT,
    "HasSystemUser" BOOLEAN
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.personid,
        p.nationalid,
        p.firstname,
        p.lastname,
        p.gender,
        p.dateofbirth,
        p.cellphone,
        p.email,
        (su.systemuserid IS NOT NULL)
    FROM person p
    LEFT JOIN systemuser su ON p.personid = su.systemuserid
    WHERE p.nationalid = $1;
END;
$$;
