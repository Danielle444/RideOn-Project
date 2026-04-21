-- ============================================================
-- FILE 1: AUTH MODULE (PostgreSQL / Supabase)
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Check if username already exists
DROP FUNCTION IF EXISTS usp_CheckUsernameExists CASCADE;
CREATE OR REPLACE FUNCTION usp_CheckUsernameExists(
    username_param TEXT
)
RETURNS TABLE("ExistsFlag" INTEGER)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT CASE WHEN EXISTS (
        SELECT 1 FROM systemuser su WHERE su.username = username_param
    ) THEN 1 ELSE 0 END AS "ExistsFlag";
END;
$$;


-- 2. Get person by national ID for registration
DROP FUNCTION IF EXISTS usp_GetPersonByNationalIdForRegistration CASCADE;
CREATE OR REPLACE FUNCTION usp_GetPersonByNationalIdForRegistration(
    nationalid_param TEXT
)
RETURNS TABLE(
    "PersonId"      INTEGER,
    "NationalId"    VARCHAR,
    "FirstName"     VARCHAR,
    "LastName"      VARCHAR,
    "Gender"        VARCHAR,
    "DateOfBirth"   DATE,
    "CellPhone"     VARCHAR,
    "Email"         VARCHAR,
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
    WHERE p.nationalid = nationalid_param;
END;
$$;


-- 3. Register system user with roles
-- NOTE: The original SQL Server version used a table-valued parameter (TVP).
-- In PostgreSQL we use two aligned arrays: RanchIds[i] pairs with RoleIds[i].
-- The C# DAL calling this function must be updated to pass integer arrays.
DROP FUNCTION IF EXISTS usp_RegisterSystemUserWithRoles CASCADE;
CREATE OR REPLACE FUNCTION usp_RegisterSystemUserWithRoles(
    nationalid_param    TEXT,
    firstname_param     TEXT,
    lastname_param      TEXT,
    username_param      TEXT,
    passwordhash_param  TEXT,
    passwordsalt_param  TEXT,
    ranchids_param      INTEGER[],
    roleids_param       SMALLINT[],
    gender_param        TEXT        DEFAULT NULL,
    dateofbirth_param   DATE        DEFAULT NULL,
    cellphone_param     TEXT        DEFAULT NULL,
    email_param         TEXT        DEFAULT NULL
)
RETURNS TABLE("NewPersonId" INTEGER)
LANGUAGE plpgsql AS $$
DECLARE
    v_person_id INTEGER;
    i           INTEGER;
BEGIN
    -- Validate: username must be unique
    IF EXISTS (SELECT 1 FROM systemuser su WHERE su.username = username_param) THEN
        RAISE EXCEPTION 'Username already exists';
    END IF;

    -- Validate: at least one ranch-role pair
    IF ranchids_param IS NULL OR array_length(ranchids_param, 1) IS NULL THEN
        RAISE EXCEPTION 'At least one ranch-role pair is required';
    END IF;

    -- Validate: all ranches exist
    IF EXISTS (
        SELECT 1 FROM unnest(ranchids_param) AS rid
        LEFT JOIN ranch r ON r.ranchid = rid
        WHERE r.ranchid IS NULL
    ) THEN
        RAISE EXCEPTION 'One or more ranches do not exist';
    END IF;

    -- Validate: all roles exist
    IF EXISTS (
        SELECT 1 FROM unnest(roleids_param) AS rid
        LEFT JOIN role r ON r.roleid = rid
        WHERE r.roleid IS NULL
    ) THEN
        RAISE EXCEPTION 'One or more roles do not exist';
    END IF;

    -- Check if person already exists
    SELECT p.personid INTO v_person_id
    FROM person p
    WHERE p.nationalid = nationalid_param;

    IF v_person_id IS NOT NULL THEN
        -- Person exists: must not already be a system user
        IF EXISTS (SELECT 1 FROM systemuser su WHERE su.systemuserid = v_person_id) THEN
            RAISE EXCEPTION 'NationalId already belongs to an existing system user';
        END IF;

        -- Update blank/null person fields only
        UPDATE person SET
            firstname   = CASE WHEN (firstname   IS NULL OR TRIM(firstname)   = '') THEN firstname_param   ELSE firstname   END,
            lastname    = CASE WHEN (lastname    IS NULL OR TRIM(lastname)    = '') THEN lastname_param    ELSE lastname    END,
            gender      = CASE WHEN (gender      IS NULL OR TRIM(gender)      = '') THEN gender_param      ELSE gender      END,
            dateofbirth = CASE WHEN dateofbirth  IS NULL                           THEN dateofbirth_param ELSE dateofbirth END,
            cellphone   = CASE WHEN (cellphone   IS NULL OR TRIM(cellphone)   = '') THEN cellphone_param   ELSE cellphone   END,
            email       = CASE WHEN (email       IS NULL OR TRIM(email)       = '') THEN email_param       ELSE email       END
        WHERE personid = v_person_id;
    ELSE
        -- Insert new person
        INSERT INTO person (nationalid, firstname, lastname, gender, dateofbirth, cellphone, email)
        VALUES (nationalid_param, firstname_param, lastname_param, gender_param, dateofbirth_param, cellphone_param, email_param)
        RETURNING personid INTO v_person_id;
    END IF;

    -- Insert SystemUser
    INSERT INTO systemuser (systemuserid, username, passwordhash, passwordsalt)
    VALUES (v_person_id, username_param, passwordhash_param, passwordsalt_param);

    -- Insert PersonRanch (distinct ranch IDs)
    INSERT INTO personranch (personid, ranchid)
    SELECT DISTINCT v_person_id, r
    FROM unnest(ranchids_param) AS r
    ON CONFLICT DO NOTHING;

    -- Insert PersonRanchRole (each ranch-role pair by index)
    FOR i IN 1..array_length(ranchids_param, 1) LOOP
        INSERT INTO personranchrole (personid, ranchid, roleid, rolestatus)
        VALUES (v_person_id, ranchids_param[i], roleids_param[i], 'Pending')
        ON CONFLICT DO NOTHING;
    END LOOP;

    RETURN QUERY SELECT v_person_id AS "NewPersonId";
END;
$$;


-- 4. Get system user for login
DROP FUNCTION IF EXISTS usp_GetSystemUserForLogin CASCADE;
CREATE OR REPLACE FUNCTION usp_GetSystemUserForLogin(
    username_param TEXT
)
RETURNS TABLE(
    "SystemUserId"      INTEGER,
    "Username"          VARCHAR,
    "PasswordHash"      VARCHAR,
    "PasswordSalt"      VARCHAR,
    "IsActive"          BOOLEAN,
    "MustChangePassword" BOOLEAN,
    "CreatedDate"       TIMESTAMPTZ,
    "FirstName"         VARCHAR,
    "LastName"          VARCHAR
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT
        su.systemuserid,
        su.username,
        su.passwordhash,
        su.passwordsalt,
        su.isactive,
        su.mustchangepassword,
        su.createddate,
        p.firstname,
        p.lastname
    FROM systemuser su
    INNER JOIN person p ON su.systemuserid = p.personid
    WHERE su.username = username_param;
END;
$$;


-- 5. Get approved ranches and roles for a logged-in person
DROP FUNCTION IF EXISTS usp_GetApprovedPersonRanchesAndRoles CASCADE;
CREATE OR REPLACE FUNCTION usp_GetApprovedPersonRanchesAndRoles(
    personid_param INTEGER
)
RETURNS TABLE(
    "RanchId"   INTEGER,
    "RanchName" VARCHAR,
    "RoleId"    SMALLINT,
    "RoleName"  VARCHAR
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT
        prr.ranchid,
        r.ranchname,
        prr.roleid,
        rl.rolename
    FROM personranchrole prr
    INNER JOIN ranch r  ON prr.ranchid = r.ranchid
    INNER JOIN role  rl ON prr.roleid  = rl.roleid
    WHERE prr.personid   = personid_param
      AND prr.rolestatus = 'Approved';
END;
$$;


-- 6. Update system user password
DROP FUNCTION IF EXISTS usp_UpdateSystemUserPassword CASCADE;
CREATE OR REPLACE FUNCTION usp_UpdateSystemUserPassword(
    systemuserid_param   INTEGER,
    newpasswordhash_param TEXT,
    newpasswordsalt_param TEXT
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE systemuser
    SET
        passwordhash       = newpasswordhash_param,
        passwordsalt       = newpasswordsalt_param,
        mustchangepassword = FALSE
    WHERE systemuserid = systemuserid_param
      AND isactive     = TRUE;
END;
$$;


-- 7. Get all roles (for registration dropdown)
DROP FUNCTION IF EXISTS usp_GetAllRoles CASCADE;
CREATE OR REPLACE FUNCTION usp_GetAllRoles()
RETURNS TABLE("RoleId" SMALLINT, "RoleName" VARCHAR)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT r.roleid, r.rolename FROM role r ORDER BY r.rolename;
END;
$$;


-- 8. Get all approved ranch names (for registration dropdown)
DROP FUNCTION IF EXISTS usp_GetAllRanchesNames CASCADE;
CREATE OR REPLACE FUNCTION usp_GetAllRanchesNames()
RETURNS TABLE("RanchId" INTEGER, "RanchName" VARCHAR)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT r.ranchid, r.ranchname
    FROM ranch r
    WHERE r.ranchstatus = 'Approved'
    ORDER BY r.ranchname;
END;
$$;
