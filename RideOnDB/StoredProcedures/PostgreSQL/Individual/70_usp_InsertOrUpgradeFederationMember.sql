CREATE OR REPLACE FUNCTION usp_InsertOrUpgradeFederationMember(
    p_HasValidMembership     BOOLEAN,
    p_MedicalCheckValidUntil DATE,
    p_CertificationLevel     TEXT,
    p_PersonId               INTEGER     DEFAULT NULL,
    p_NationalId             TEXT        DEFAULT NULL,
    p_FirstName              TEXT        DEFAULT NULL,
    p_LastName               TEXT        DEFAULT NULL,
    p_Gender                 TEXT        DEFAULT NULL,
    p_DateOfBirth            DATE        DEFAULT NULL,
    p_CellPhone              TEXT        DEFAULT NULL,
    p_Email                  TEXT        DEFAULT NULL
)
RETURNS TABLE("FederationMemberId" INTEGER)
LANGUAGE plpgsql AS $$
DECLARE
    v_person_id INTEGER := p_PersonId;
BEGIN
    IF v_person_id IS NULL THEN
        INSERT INTO person (nationalid, firstname, lastname, gender, dateofbirth, cellphone, email)
        VALUES (p_NationalId, p_FirstName, p_LastName, p_Gender, p_DateOfBirth, p_CellPhone, p_Email)
        RETURNING personid INTO v_person_id;
    END IF;

    INSERT INTO federationmember (federationmemberid, hasvalidmembership, medicalcheckvaliduntil, certificationlevel)
    VALUES (v_person_id, p_HasValidMembership, p_MedicalCheckValidUntil, p_CertificationLevel);

    RETURN QUERY SELECT v_person_id AS "FederationMemberId";
END;
$$;
