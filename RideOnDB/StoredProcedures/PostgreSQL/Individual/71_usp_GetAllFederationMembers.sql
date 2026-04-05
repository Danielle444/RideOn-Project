CREATE OR REPLACE FUNCTION usp_GetAllFederationMembers()
RETURNS TABLE(
    "FederationMemberId"     INTEGER,
    "NationalId"             TEXT,
    "FirstName"              TEXT,
    "LastName"               TEXT,
    "HasValidMembership"     BOOLEAN,
    "MedicalCheckValidUntil" DATE,
    "CertificationLevel"     TEXT
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT
        fm.federationmemberid, p.nationalid, p.firstname, p.lastname,
        fm.hasvalidmembership, fm.medicalcheckvaliduntil, fm.certificationlevel
    FROM federationmember fm
    INNER JOIN person p ON fm.federationmemberid = p.personid;
END;
$$;
