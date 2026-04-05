-- ============================================================
-- FILE 1: AUTH MODULE (PostgreSQL / Supabase)
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Check if username already exists
CREATE OR REPLACE FUNCTION usp_CheckUsernameExists(
    "Username" TEXT
)
RETURNS TABLE("ExistsFlag" INTEGER)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT CASE WHEN EXISTS (
        SELECT 1 FROM systemuser su WHERE su.username = "Username"
    ) THEN 1 ELSE 0 END AS "ExistsFlag";
END;
$$;


-- 2. Get person by national ID for registration
CREATE OR REPLACE FUNCTION usp_GetPersonByNationalIdForRegistration(
    "NationalId" TEXT
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
    WHERE p.nationalid = "NationalId";
END;
$$;


-- 3. Register system user with roles
-- NOTE: The original SQL Server version used a table-valued parameter (TVP).
-- In PostgreSQL we use two aligned arrays: RanchIds[i] pairs with RoleIds[i].
-- The C# DAL calling this function must be updated to pass integer arrays.
CREATE OR REPLACE FUNCTION usp_RegisterSystemUserWithRoles(
    "NationalId"    TEXT,
    "FirstName"     TEXT,
    "LastName"      TEXT,
    "Gender"        TEXT        DEFAULT NULL,
    "DateOfBirth"   DATE        DEFAULT NULL,
    "CellPhone"     TEXT        DEFAULT NULL,
    "Email"         TEXT        DEFAULT NULL,
    "Username"      TEXT,
    "PasswordHash"  TEXT,
    "PasswordSalt"  TEXT,
    "RanchIds"      INTEGER[],
    "RoleIds"       SMALLINT[]
)
RETURNS TABLE("NewPersonId" INTEGER)
LANGUAGE plpgsql AS $$
DECLARE
    v_person_id INTEGER;
    i           INTEGER;
BEGIN
    -- Validate: username must be unique
    IF EXISTS (SELECT 1 FROM systemuser su WHERE su.username = "Username") THEN
        RAISE EXCEPTION 'Username already exists';
    END IF;

    -- Validate: at least one ranch-role pair
    IF "RanchIds" IS NULL OR array_length("RanchIds", 1) IS NULL THEN
        RAISE EXCEPTION 'At least one ranch-role pair is required';
    END IF;

    -- Validate: all ranches exist
    IF EXISTS (
        SELECT 1 FROM unnest("RanchIds") AS rid
        LEFT JOIN ranch r ON r.ranchid = rid
        WHERE r.ranchid IS NULL
    ) THEN
        RAISE EXCEPTION 'One or more ranches do not exist';
    END IF;

    -- Validate: all roles exist
    IF EXISTS (
        SELECT 1 FROM unnest("RoleIds") AS rid
        LEFT JOIN role r ON r.roleid = rid
        WHERE r.roleid IS NULL
    ) THEN
        RAISE EXCEPTION 'One or more roles do not exist';
    END IF;

    -- Check if person already exists
    SELECT p.personid INTO v_person_id
    FROM person p
    WHERE p.nationalid = "NationalId";

    IF v_person_id IS NOT NULL THEN
        -- Person exists: must not already be a system user
        IF EXISTS (SELECT 1 FROM systemuser su WHERE su.systemuserid = v_person_id) THEN
            RAISE EXCEPTION 'NationalId already belongs to an existing system user';
        END IF;

        -- Update blank/null person fields only
        UPDATE person SET
            firstname   = CASE WHEN (firstname   IS NULL OR TRIM(firstname)   = '') THEN "FirstName"   ELSE firstname   END,
            lastname    = CASE WHEN (lastname    IS NULL OR TRIM(lastname)    = '') THEN "LastName"    ELSE lastname    END,
            gender      = CASE WHEN (gender      IS NULL OR TRIM(gender)      = '') THEN "Gender"      ELSE gender      END,
            dateofbirth = CASE WHEN dateofbirth  IS NULL                           THEN "DateOfBirth" ELSE dateofbirth END,
            cellphone   = CASE WHEN (cellphone   IS NULL OR TRIM(cellphone)   = '') THEN "CellPhone"   ELSE cellphone   END,
            email       = CASE WHEN (email       IS NULL OR TRIM(email)       = '') THEN "Email"       ELSE email       END
        WHERE personid = v_person_id;
    ELSE
        -- Insert new person
        INSERT INTO person (nationalid, firstname, lastname, gender, dateofbirth, cellphone, email)
        VALUES ("NationalId", "FirstName", "LastName", "Gender", "DateOfBirth", "CellPhone", "Email")
        RETURNING personid INTO v_person_id;
    END IF;

    -- Insert SystemUser
    INSERT INTO systemuser (systemuserid, username, passwordhash, passwordsalt)
    VALUES (v_person_id, "Username", "PasswordHash", "PasswordSalt");

    -- Insert PersonRanch (distinct ranch IDs)
    INSERT INTO personranch (personid, ranchid)
    SELECT DISTINCT v_person_id, r
    FROM unnest("RanchIds") AS r
    ON CONFLICT DO NOTHING;

    -- Insert PersonRanchRole (each ranch-role pair by index)
    FOR i IN 1..array_length("RanchIds", 1) LOOP
        INSERT INTO personranchrole (personid, ranchid, roleid, rolestatus)
        VALUES (v_person_id, "RanchIds"[i], "RoleIds"[i], 'Pending')
        ON CONFLICT DO NOTHING;
    END LOOP;

    RETURN QUERY SELECT v_person_id AS "NewPersonId";
END;
$$;


-- 4. Get system user for login
CREATE OR REPLACE FUNCTION usp_GetSystemUserForLogin(
    "Username" TEXT
)
RETURNS TABLE(
    "SystemUserId"      INTEGER,
    "Username"          TEXT,
    "PasswordHash"      TEXT,
    "PasswordSalt"      TEXT,
    "IsActive"          BOOLEAN,
    "MustChangePassword" BOOLEAN,
    "CreatedDate"       TIMESTAMP,
    "FirstName"         TEXT,
    "LastName"          TEXT
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
    WHERE su.username = "Username";
END;
$$;


-- 5. Get approved ranches and roles for a logged-in person
CREATE OR REPLACE FUNCTION usp_GetApprovedPersonRanchesAndRoles(
    "PersonId" INTEGER
)
RETURNS TABLE(
    "RanchId"   INTEGER,
    "RanchName" TEXT,
    "RoleId"    SMALLINT,
    "RoleName"  TEXT
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
    WHERE prr.personid   = "PersonId"
      AND prr.rolestatus = 'Approved';
END;
$$;


-- 6. Update system user password
CREATE OR REPLACE FUNCTION usp_UpdateSystemUserPassword(
    "SystemUserId"   INTEGER,
    "NewPasswordHash" TEXT,
    "NewPasswordSalt" TEXT
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE systemuser
    SET
        passwordhash       = "NewPasswordHash",
        passwordsalt       = "NewPasswordSalt",
        mustchangepassword = FALSE
    WHERE systemuserid = "SystemUserId"
      AND isactive     = TRUE;
END;
$$;


-- 7. Get all roles (for registration dropdown)
CREATE OR REPLACE FUNCTION usp_GetAllRoles()
RETURNS TABLE("RoleId" SMALLINT, "RoleName" TEXT)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT r.roleid, r.rolename FROM role r ORDER BY r.rolename;
END;
$$;


-- 8. Get all approved ranch names (for registration dropdown)
CREATE OR REPLACE FUNCTION usp_GetAllRanchesNames()
RETURNS TABLE("RanchId" INTEGER, "RanchName" TEXT)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT r.ranchid, r.ranchname
    FROM ranch r
    WHERE r.ranchstatus = 'Approved'
    ORDER BY r.ranchname;
END;
$$;
