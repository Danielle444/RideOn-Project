CREATE OR REPLACE FUNCTION usp_SearchPersons(
    p_SearchText TEXT    DEFAULT NULL,
    p_IsActive   BOOLEAN DEFAULT NULL
)
RETURNS TABLE(
    "PersonId"   INTEGER,
    "NationalId" TEXT,
    "FirstName"  TEXT,
    "LastName"   TEXT,
    "Email"      TEXT,
    "CellPhone"  TEXT,
    "Username"   TEXT,
    "IsActive"   BOOLEAN
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.personid, p.nationalid, p.firstname, p.lastname, p.email, p.cellphone,
        su.username, su.isactive
    FROM person p
    INNER JOIN systemuser su ON p.personid = su.systemuserid
    WHERE (p_SearchText IS NULL OR
           p.firstname ILIKE '%' || p_SearchText || '%' OR
           p.lastname  ILIKE '%' || p_SearchText || '%')
      AND (p_IsActive IS NULL OR su.isactive = p_IsActive);
END;
$$;
