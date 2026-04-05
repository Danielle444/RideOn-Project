CREATE OR REPLACE FUNCTION usp_InsertOrUpgradeFederationMember(
    "HasValidMembership"     BOOLEAN,
    "MedicalCheckValidUntil" DATE,
    "CertificationLevel"     TEXT,
    "PersonId"               INTEGER     DEFAULT NULL,
    "NationalId"             TEXT        DEFAULT NULL,
    "FirstName"              TEXT        DEFAULT NULL,
    "LastName"               TEXT        DEFAULT NULL,
    "Gender"                 TEXT        DEFAULT NULL,
    "DateOfBirth"            DATE        DEFAULT NULL,
    "CellPhone"              TEXT        DEFAULT NULL,
    "Email"                  TEXT        DEFAULT NULL
)
RETURNS TABLE("FederationMemberId" INTEGER)
LANGUAGE plpgsql AS $$
DECLARE
    v_person_id INTEGER := "PersonId";
BEGIN
    IF v_person_id IS NULL THEN
        INSERT INTO person (nationalid, firstname, lastname, gender, dateofbirth, cellphone, email)
        VALUES ("NationalId", "FirstName", "LastName", "Gender", "DateOfBirth", "CellPhone", "Email")
        RETURNING personid INTO v_person_id;
    END IF;

    INSERT INTO federationmember (federationmemberid, hasvalidmembership, medicalcheckvaliduntil, certificationlevel)
    VALUES (v_person_id, "HasValidMembership", "MedicalCheckValidUntil", "CertificationLevel");

    RETURN QUERY SELECT v_person_id AS "FederationMemberId";
END;
$$;
