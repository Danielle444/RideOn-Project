CREATE OR REPLACE FUNCTION usp_RegisterSystemUserWithRoles(
    p_NationalId    TEXT,
    p_FirstName     TEXT,
    p_LastName      TEXT,
    p_Username      TEXT,
    p_PasswordHash  TEXT,
    p_PasswordSalt  TEXT,
    p_RanchIds      INTEGER[],
    p_RoleIds       SMALLINT[],
    p_Gender        TEXT        DEFAULT NULL,
    p_DateOfBirth   DATE        DEFAULT NULL,
    p_CellPhone     TEXT        DEFAULT NULL,
    p_Email         TEXT        DEFAULT NULL
)
RETURNS TABLE("NewPersonId" INTEGER)
LANGUAGE plpgsql AS $$
DECLARE
    v_person_id INTEGER;
    i           INTEGER;
BEGIN
    -- Validate: username must be unique
    IF EXISTS (SELECT 1 FROM systemuser su WHERE su.username = p_Username) THEN
        RAISE EXCEPTION 'Username already exists';
    END IF;

    -- Validate: at least one ranch-role pair
    IF p_RanchIds IS NULL OR array_length(p_RanchIds, 1) IS NULL THEN
        RAISE EXCEPTION 'At least one ranch-role pair is required';
    END IF;

    -- Validate: all ranches exist
    IF EXISTS (
        SELECT 1 FROM unnest(p_RanchIds) AS rid
        LEFT JOIN ranch r ON r.ranchid = rid
        WHERE r.ranchid IS NULL
    ) THEN
        RAISE EXCEPTION 'One or more ranches do not exist';
    END IF;

    -- Validate: all roles exist
    IF EXISTS (
        SELECT 1 FROM unnest(p_RoleIds) AS rid
        LEFT JOIN role r ON r.roleid = rid
        WHERE r.roleid IS NULL
    ) THEN
        RAISE EXCEPTION 'One or more roles do not exist';
    END IF;

    -- Check if person already exists
    SELECT p.personid INTO v_person_id
    FROM person p
    WHERE p.nationalid = p_NationalId;

    IF v_person_id IS NOT NULL THEN
        -- Person exists: must not already be a system user
        IF EXISTS (SELECT 1 FROM systemuser su WHERE su.systemuserid = v_person_id) THEN
            RAISE EXCEPTION 'NationalId already belongs to an existing system user';
        END IF;

        -- Update blank/null person fields only
        UPDATE person SET
            firstname   = CASE WHEN (firstname   IS NULL OR TRIM(firstname)   = '') THEN p_FirstName   ELSE firstname   END,
            lastname    = CASE WHEN (lastname    IS NULL OR TRIM(lastname)    = '') THEN p_LastName    ELSE lastname    END,
            gender      = CASE WHEN (gender      IS NULL OR TRIM(gender)      = '') THEN p_Gender      ELSE gender      END,
            dateofbirth = CASE WHEN dateofbirth  IS NULL                           THEN p_DateOfBirth ELSE dateofbirth END,
            cellphone   = CASE WHEN (cellphone   IS NULL OR TRIM(cellphone)   = '') THEN p_CellPhone   ELSE cellphone   END,
            email       = CASE WHEN (email       IS NULL OR TRIM(email)       = '') THEN p_Email       ELSE email       END
        WHERE personid = v_person_id;
    ELSE
        -- Insert new person
        INSERT INTO person (nationalid, firstname, lastname, gender, dateofbirth, cellphone, email)
        VALUES (p_NationalId, p_FirstName, p_LastName, p_Gender, p_DateOfBirth, p_CellPhone, p_Email)
        RETURNING personid INTO v_person_id;
    END IF;

    -- Insert SystemUser
    INSERT INTO systemuser (systemuserid, username, passwordhash, passwordsalt)
    VALUES (v_person_id, p_Username, p_PasswordHash, p_PasswordSalt);

    -- Insert PersonRanch (distinct ranch IDs)
    INSERT INTO personranch (personid, ranchid)
    SELECT DISTINCT v_person_id, r
    FROM unnest(p_RanchIds) AS r
    ON CONFLICT DO NOTHING;

    -- Insert PersonRanchRole (each ranch-role pair by index)
    FOR i IN 1..array_length(p_RanchIds, 1) LOOP
        INSERT INTO personranchrole (personid, ranchid, roleid, rolestatus)
        VALUES (v_person_id, p_RanchIds[i], p_RoleIds[i], 'Pending')
        ON CONFLICT DO NOTHING;
    END LOOP;

    RETURN QUERY SELECT v_person_id AS "NewPersonId";
END;
$$;
