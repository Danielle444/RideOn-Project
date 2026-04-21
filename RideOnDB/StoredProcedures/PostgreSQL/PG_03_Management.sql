-- ============================================================
-- FILE 3: MANAGEMENT MODULE (PostgreSQL / Supabase)
-- Covers: Ranch, SuperUser, Fields, Judges, Person, Roles
-- Run this in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- RANCH
-- ============================================================

-- Insert new ranch
DROP FUNCTION IF EXISTS usp_InsertRanch(TEXT, TEXT, TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION) CASCADE;
CREATE OR REPLACE FUNCTION usp_InsertRanch(
    ranchname_param    TEXT,
    contactemail_param TEXT    DEFAULT NULL,
    contactphone_param TEXT    DEFAULT NULL,
    websiteurl_param   TEXT    DEFAULT NULL,
    lat_param          DOUBLE PRECISION DEFAULT NULL,
    long_param         DOUBLE PRECISION DEFAULT NULL
)
RETURNS TABLE("NewRanchId" INTEGER)
LANGUAGE plpgsql AS $$
DECLARE
    v_new_id  INTEGER;
    v_geog    geography := NULL;
BEGIN
    IF lat_param IS NOT NULL AND long_param IS NOT NULL THEN
        v_geog := ST_SetSRID(ST_MakePoint(long_param, lat_param), 4326)::geography;
    END IF;

    INSERT INTO ranch (ranchname, contactemail, contactphone, websiteurl, location, ranchstatus)
    VALUES (ranchname_param, contactemail_param, contactphone_param, websiteurl_param, v_geog, 'Pending')
    RETURNING ranchid INTO v_new_id;

    RETURN QUERY SELECT v_new_id AS "NewRanchId";
END;
$$;


-- Insert new ranch request
DROP FUNCTION IF EXISTS usp_InsertNewRanchRequest(INTEGER, INTEGER) CASCADE;
CREATE OR REPLACE FUNCTION usp_InsertNewRanchRequest(
    ranchid_param                 INTEGER,
    submittedbysystemuserid_param INTEGER
)
RETURNS TABLE("NewRequestId" INTEGER)
LANGUAGE plpgsql AS $$
DECLARE
    v_new_id INTEGER;
BEGIN
    INSERT INTO newranchrequest (ranchid, submittedbysystemuserid)
    VALUES (ranchid_param, submittedbysystemuserid_param)
    RETURNING requestid INTO v_new_id;

    RETURN QUERY SELECT v_new_id AS "NewRequestId";
END;
$$;


-- Update ranch request status (and update ranch status accordingly)
DROP FUNCTION IF EXISTS usp_UpdateNewRanchRequestStatus(INTEGER, INTEGER, TEXT) CASCADE;
CREATE OR REPLACE FUNCTION usp_UpdateNewRanchRequestStatus(
    requestid_param            INTEGER,
    resolvedbysuperuserid_param INTEGER,
    newstatus_param            TEXT
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE newranchrequest SET
        requeststatus         = newstatus_param,
        resolvedbysuperuserid = resolvedbysuperuserid_param,
        resolveddate          = NOW()
    WHERE requestid = requestid_param;

    UPDATE ranch r SET
        ranchstatus = newstatus_param
    FROM newranchrequest nrr
    WHERE r.ranchid = nrr.ranchid
      AND nrr.requestid = requestid_param;
END;
$$;


-- Update ranch details
DROP FUNCTION IF EXISTS usp_UpdateRanch(INTEGER, TEXT, TEXT, TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION) CASCADE;
CREATE OR REPLACE FUNCTION usp_UpdateRanch(
    ranchid_param    INTEGER,
    ranchname_param  TEXT,
    contactemail_param TEXT DEFAULT NULL,
    contactphone_param TEXT DEFAULT NULL,
    websiteurl_param   TEXT DEFAULT NULL,
    latitude_param     DOUBLE PRECISION DEFAULT NULL,
    longitude_param    DOUBLE PRECISION DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql AS $$
DECLARE
    v_geog geography := NULL;
BEGIN
    IF latitude_param IS NOT NULL AND longitude_param IS NOT NULL THEN
        v_geog := ST_SetSRID(ST_MakePoint(longitude_param, latitude_param), 4326)::geography;
    END IF;

    UPDATE ranch SET
        ranchname    = ranchname_param,
        contactemail = contactemail_param,
        contactphone = contactphone_param,
        websiteurl   = websiteurl_param,
        location     = v_geog
    WHERE ranchid = ranchid_param;
END;
$$;


-- Get ranch by ID
DROP FUNCTION IF EXISTS usp_GetRanchById(INTEGER) CASCADE;
CREATE OR REPLACE FUNCTION usp_GetRanchById(
    ranchid_param INTEGER
)
RETURNS TABLE(
    "RanchId"      INTEGER,
    "RanchName"    VARCHAR,
    "ContactEmail" VARCHAR,
    "ContactPhone" VARCHAR,
    "WebsiteUrl"   VARCHAR,
    "Latitude"     DOUBLE PRECISION,
    "Longitude"    DOUBLE PRECISION
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT
        r.ranchid,
        r.ranchname,
        r.contactemail,
        r.contactphone,
        r.websiteurl,
        ST_Y(r.location::geometry),
        ST_X(r.location::geometry)
    FROM ranch r
    WHERE r.ranchid = ranchid_param;
END;
$$;


-- Get all ranches for a user
DROP FUNCTION IF EXISTS usp_GetAllRanchesByUserId(INTEGER) CASCADE;
CREATE OR REPLACE FUNCTION usp_GetAllRanchesByUserId(
    userid_param INTEGER
)
RETURNS TABLE(
    "RanchId"      INTEGER,
    "RanchName"    VARCHAR,
    "ContactEmail" VARCHAR,
    "ContactPhone" VARCHAR,
    "WebsiteUrl"   VARCHAR,
    "Latitude"     DOUBLE PRECISION,
    "Longitude"    DOUBLE PRECISION
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT
        r.ranchid,
        r.ranchname,
        r.contactemail,
        r.contactphone,
        r.websiteurl,
        ST_Y(r.location::geometry),
        ST_X(r.location::geometry)
    FROM ranch r
    INNER JOIN personranch pr ON r.ranchid = pr.ranchid
    WHERE pr.personid   = userid_param
      AND r.ranchstatus = 'Approved';
END;
$$;


-- ============================================================
-- SUPER USER
-- ============================================================

-- Insert super user
DROP FUNCTION IF EXISTS usp_InsertSuperUser(TEXT, TEXT, TEXT, BOOLEAN) CASCADE;
CREATE OR REPLACE FUNCTION usp_InsertSuperUser(
    email_param              TEXT,
    passwordhash_param       TEXT,
    passwordsalt_param       TEXT,
    mustchangepassword_param BOOLEAN DEFAULT TRUE
)
RETURNS TABLE("NewSuperUserId" INTEGER)
LANGUAGE plpgsql AS $$
DECLARE
    v_new_id INTEGER;
BEGIN
    INSERT INTO superuser (email, passwordhash, passwordsalt, mustchangepassword)
    VALUES (email_param, passwordhash_param, passwordsalt_param, mustchangepassword_param)
    RETURNING superuserid INTO v_new_id;

    RETURN QUERY SELECT v_new_id AS "NewSuperUserId";
END;
$$;


-- Get all super users
DROP FUNCTION IF EXISTS usp_GetAllSuperUsers() CASCADE;
CREATE OR REPLACE FUNCTION usp_GetAllSuperUsers()
RETURNS TABLE(
    "SuperUserId"        INTEGER,
    "Email"              VARCHAR,
    "IsActive"           BOOLEAN,
    "MustChangePassword" BOOLEAN,
    "CreatedDate"        TIMESTAMP,
    "LastLoginDate"      TIMESTAMP
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT su.superuserid, su.email, su.isactive, su.mustchangepassword,
           su.createddate, su.lastlogindate
    FROM superuser su
    ORDER BY su.createddate DESC;
END;
$$;


-- Get super user by ID
DROP FUNCTION IF EXISTS usp_GetSuperUserById(INTEGER) CASCADE;
CREATE OR REPLACE FUNCTION usp_GetSuperUserById(
    superuserid_param INTEGER
)
RETURNS TABLE(
    "SuperUserId"        INTEGER,
    "Email"              VARCHAR,
    "PasswordHash"       VARCHAR,
    "PasswordSalt"       VARCHAR,
    "IsActive"           BOOLEAN,
    "MustChangePassword" BOOLEAN
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT su.superuserid, su.email, su.passwordhash, su.passwordsalt,
           su.isactive, su.mustchangepassword
    FROM superuser su
    WHERE su.superuserid = superuserid_param;
END;
$$;


-- Get super user for login
DROP FUNCTION IF EXISTS usp_GetSuperUserForLogin(TEXT) CASCADE;
CREATE OR REPLACE FUNCTION usp_GetSuperUserForLogin(
    email_param TEXT
)
RETURNS TABLE(
    "SuperUserId"        INTEGER,
    "Email"              VARCHAR,
    "PasswordHash"       VARCHAR,
    "PasswordSalt"       VARCHAR,
    "IsActive"           BOOLEAN,
    "MustChangePassword" BOOLEAN
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT su.superuserid, su.email, su.passwordhash, su.passwordsalt,
           su.isactive, su.mustchangepassword
    FROM superuser su
    WHERE su.email = email_param;
END;
$$;


-- Update super user last login timestamp
DROP FUNCTION IF EXISTS usp_UpdateSuperUserLastLogin(INTEGER) CASCADE;
CREATE OR REPLACE FUNCTION usp_UpdateSuperUserLastLogin(
    superuserid_param INTEGER
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE superuser SET lastlogindate = NOW()
    WHERE superuserid = superuserid_param;
END;
$$;


-- Update super user password
DROP FUNCTION IF EXISTS usp_UpdateSuperUserPassword(INTEGER, TEXT, TEXT) CASCADE;
CREATE OR REPLACE FUNCTION usp_UpdateSuperUserPassword(
    superuserid_param    INTEGER,
    newpasswordhash_param TEXT,
    newpasswordsalt_param TEXT
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE superuser SET
        passwordhash       = newpasswordhash_param,
        passwordsalt       = newpasswordsalt_param,
        mustchangepassword = FALSE
    WHERE superuserid = superuserid_param
      AND isactive    = TRUE;
END;
$$;


-- Check if super user email exists
DROP FUNCTION IF EXISTS usp_CheckSuperUserEmailExists(TEXT) CASCADE;
CREATE OR REPLACE FUNCTION usp_CheckSuperUserEmailExists(
    email_param TEXT
)
RETURNS TABLE("ExistsFlag" INTEGER)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT CASE WHEN EXISTS (
        SELECT 1 FROM superuser su WHERE su.email = email_param
    ) THEN 1 ELSE 0 END AS "ExistsFlag";
END;
$$;


-- Get role requests (super user view)
DROP FUNCTION IF EXISTS usp_GetRoleRequests(SMALLINT, TEXT, TEXT) CASCADE;
CREATE OR REPLACE FUNCTION usp_GetRoleRequests(
    roleid_param     SMALLINT,
    rolestatus_param TEXT DEFAULT NULL,
    searchtext_param TEXT DEFAULT NULL
)
RETURNS TABLE(
    "PersonId"   INTEGER,
    "RanchId"    INTEGER,
    "RoleId"     SMALLINT,
    "FullName"   VARCHAR,
    "NationalId" VARCHAR,
    "Email"      VARCHAR,
    "CellPhone"  VARCHAR,
    "RanchName"  VARCHAR,
    "RoleName"   VARCHAR,
    "RoleStatus" VARCHAR
)
LANGUAGE plpgsql AS $$
BEGIN
    IF rolestatus_param IS NOT NULL AND rolestatus_param NOT IN ('Pending', 'Approved', 'Rejected') THEN
        RAISE EXCEPTION 'Invalid RoleStatus. Allowed: Pending, Approved, Rejected.';
    END IF;

    RETURN QUERY
    SELECT
        prr.personid,
        prr.ranchid,
        prr.roleid,
        (p.firstname || ' ' || p.lastname),
        p.nationalid,
        p.email,
        p.cellphone,
        r.ranchname,
        rl.rolename,
        prr.rolestatus
    FROM personranchrole prr
    INNER JOIN person p ON prr.personid = p.personid
    INNER JOIN ranch  r ON prr.ranchid  = r.ranchid
    INNER JOIN role  rl ON prr.roleid   = rl.roleid
    WHERE prr.roleid = roleid_param
      AND (rolestatus_param IS NULL OR prr.rolestatus = rolestatus_param)
      AND (
            searchtext_param IS NULL OR TRIM(searchtext_param) = ''
            OR (p.firstname || ' ' || p.lastname) ILIKE '%' || searchtext_param || '%'
            OR p.nationalid ILIKE '%' || searchtext_param || '%'
            OR COALESCE(p.email, '') ILIKE '%' || searchtext_param || '%'
            OR COALESCE(p.cellphone, '') ILIKE '%' || searchtext_param || '%'
            OR r.ranchname ILIKE '%' || searchtext_param || '%'
          )
    ORDER BY
        CASE prr.rolestatus
            WHEN 'Pending'  THEN 1
            WHEN 'Approved' THEN 2
            WHEN 'Rejected' THEN 3
            ELSE 4
        END,
        p.firstname, p.lastname;
END;
$$;


-- Get new ranch requests (super user view)
DROP FUNCTION IF EXISTS usp_GetNewRanchRequests(TEXT, TEXT) CASCADE;
CREATE OR REPLACE FUNCTION usp_GetNewRanchRequests(
    requeststatus_param TEXT DEFAULT NULL,
    searchtext_param    TEXT DEFAULT NULL
)
RETURNS TABLE(
    "RequestId"               INTEGER,
    "RanchId"                 INTEGER,
    "SubmittedBySystemUserId" INTEGER,
    "RequestDate"             TIMESTAMP,
    "RanchName"               VARCHAR,
    "PersonId"                INTEGER,
    "FullName"                VARCHAR,
    "NationalId"              VARCHAR,
    "Email"                   VARCHAR,
    "CellPhone"               VARCHAR,
    "RequestStatus"           VARCHAR,
    "ResolvedBySuperUserId"   INTEGER,
    "ResolvedBySuperUserEmail" VARCHAR,
    "ResolvedDate"            TIMESTAMP
)
LANGUAGE plpgsql AS $$
BEGIN
    IF requeststatus_param IS NOT NULL AND requeststatus_param NOT IN ('Pending', 'Approved', 'Rejected') THEN
        RAISE EXCEPTION 'Invalid RequestStatus. Allowed: Pending, Approved, Rejected.';
    END IF;

    RETURN QUERY
    SELECT
        nrr.requestid,
        nrr.ranchid,
        nrr.submittedbysystemuserid,
        nrr.requestdate,
        r.ranchname,
        p.personid,
        (p.firstname || ' ' || p.lastname),
        p.nationalid,
        p.email,
        p.cellphone,
        nrr.requeststatus,
        nrr.resolvedbysuperuserid,
        su.email,
        nrr.resolveddate
    FROM newranchrequest nrr
    INNER JOIN ranch      r    ON nrr.ranchid = r.ranchid
    INNER JOIN systemuser sysu ON nrr.submittedbysystemuserid = sysu.systemuserid
    INNER JOIN person     p    ON sysu.systemuserid = p.personid
    LEFT  JOIN superuser  su   ON nrr.resolvedbysuperuserid = su.superuserid
    WHERE (requeststatus_param IS NULL OR nrr.requeststatus = requeststatus_param)
      AND (
            searchtext_param IS NULL OR TRIM(searchtext_param) = ''
            OR r.ranchname ILIKE '%' || searchtext_param || '%'
            OR (p.firstname || ' ' || p.lastname) ILIKE '%' || searchtext_param || '%'
            OR p.nationalid ILIKE '%' || searchtext_param || '%'
            OR COALESCE(p.email, '') ILIKE '%' || searchtext_param || '%'
            OR COALESCE(p.cellphone, '') ILIKE '%' || searchtext_param || '%'
          )
    ORDER BY
        CASE nrr.requeststatus
            WHEN 'Pending'  THEN 1
            WHEN 'Approved' THEN 2
            WHEN 'Rejected' THEN 3
            ELSE 4
        END,
        nrr.requestdate DESC;
END;
$$;


-- Get pending role requests (ranch admin/secretary view)
DROP FUNCTION IF EXISTS usp_GetPendingRoleRequests(SMALLINT) CASCADE;
CREATE OR REPLACE FUNCTION usp_GetPendingRoleRequests(
    roleid_param SMALLINT
)
RETURNS TABLE(
    "PersonId"   INTEGER,
    "RanchId"    INTEGER,
    "RoleId"     SMALLINT,
    "FullName"   VARCHAR,
    "IdNumber"   VARCHAR,
    "Email"      VARCHAR,
    "PhoneNumber" VARCHAR,
    "RanchName"  VARCHAR,
    "RoleStatus" VARCHAR
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT
        prr.personid,
        prr.ranchid,
        prr.roleid,
        (p.firstname || ' ' || p.lastname),
        p.nationalid,
        p.email,
        p.cellphone,
        r.ranchname,
        prr.rolestatus
    FROM personranchrole prr
    INNER JOIN person p ON prr.personid = p.personid
    INNER JOIN ranch  r ON prr.ranchid  = r.ranchid
    WHERE prr.rolestatus = 'Pending'
      AND prr.roleid     = roleid_param
    ORDER BY p.firstname;
END;
$$;


-- Get pending new ranch requests (ranch admin view)
DROP FUNCTION IF EXISTS usp_GetPendingNewRanchRequests() CASCADE;
CREATE OR REPLACE FUNCTION usp_GetPendingNewRanchRequests()
RETURNS TABLE(
    "RequestId"     INTEGER,
    "RequestDate"   TIMESTAMP,
    "RanchName"     VARCHAR,
    "FullName"      VARCHAR,
    "NationalId"    VARCHAR,
    "Email"         VARCHAR,
    "RequestStatus" VARCHAR
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT
        nrr.requestid,
        nrr.requestdate,
        r.ranchname,
        (p.firstname || ' ' || p.lastname),
        p.nationalid,
        p.email,
        nrr.requeststatus
    FROM newranchrequest nrr
    INNER JOIN ranch  r ON nrr.ranchid = r.ranchid
    INNER JOIN person p ON nrr.submittedbysystemuserid = p.personid
    WHERE nrr.requeststatus = 'Pending'
    ORDER BY nrr.requestdate ASC;
END;
$$;


-- ============================================================
-- FIELDS
-- ============================================================

-- Get all fields
DROP FUNCTION IF EXISTS usp_GetAllFields() CASCADE;
CREATE OR REPLACE FUNCTION usp_GetAllFields()
RETURNS TABLE("FieldId" SMALLINT, "FieldName" VARCHAR)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT f.fieldid, f.fieldname FROM field f ORDER BY f.fieldname;
END;
$$;


-- Insert field
DROP FUNCTION IF EXISTS usp_InsertField(TEXT) CASCADE;
CREATE OR REPLACE FUNCTION usp_InsertField(
    fieldname_param TEXT
)
RETURNS TABLE("NewFieldId" SMALLINT)
LANGUAGE plpgsql AS $$
DECLARE
    v_new_id SMALLINT;
BEGIN
    INSERT INTO field (fieldname) VALUES (fieldname_param)
    RETURNING fieldid INTO v_new_id;

    RETURN QUERY SELECT v_new_id AS "NewFieldId";
END;
$$;


-- Update field
DROP FUNCTION IF EXISTS usp_UpdateField(SMALLINT, TEXT) CASCADE;
CREATE OR REPLACE FUNCTION usp_UpdateField(
    fieldid_param   SMALLINT,
    fieldname_param TEXT
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE field SET fieldname = fieldname_param WHERE fieldid = fieldid_param;
END;
$$;


-- Delete field (with validation)
DROP FUNCTION IF EXISTS usp_DeleteField(SMALLINT) CASCADE;
CREATE OR REPLACE FUNCTION usp_DeleteField(
    fieldid_param SMALLINT
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM competition c WHERE c.fieldid = fieldid_param) THEN
        RAISE EXCEPTION 'Cannot delete field: There are competitions associated with this field.';
    END IF;
    IF EXISTS (SELECT 1 FROM classtype ct WHERE ct.fieldid = fieldid_param) THEN
        RAISE EXCEPTION 'Cannot delete field: There are class types associated with this field.';
    END IF;
    IF EXISTS (SELECT 1 FROM judgefield jf WHERE jf.fieldid = fieldid_param) THEN
        RAISE EXCEPTION 'Cannot delete field: There are judges qualified for this field.';
    END IF;

    DELETE FROM field WHERE fieldid = fieldid_param;
END;
$$;


-- ============================================================
-- CLASS TYPES
-- ============================================================

-- Insert class type
DROP FUNCTION IF EXISTS usp_InsertClassType(SMALLINT, TEXT, TEXT, TEXT) CASCADE;
CREATE OR REPLACE FUNCTION usp_InsertClassType(
    fieldid_param                  SMALLINT,
    classname_param                TEXT,
    judgingsheetformat_param       TEXT,
    qualificationdescription_param TEXT DEFAULT NULL
)
RETURNS TABLE("NewClassTypeId" SMALLINT)
LANGUAGE plpgsql AS $$
DECLARE
    v_new_id SMALLINT;
BEGIN
    INSERT INTO classtype (fieldid, classname, judgingsheetformat, qualificationdescription)
    VALUES (fieldid_param, classname_param, judgingsheetformat_param, qualificationdescription_param)
    RETURNING classtypeid INTO v_new_id;

    RETURN QUERY SELECT v_new_id AS "NewClassTypeId";
END;
$$;


-- Update class type
DROP FUNCTION IF EXISTS usp_UpdateClassType(SMALLINT, SMALLINT, TEXT, TEXT, TEXT) CASCADE;
CREATE OR REPLACE FUNCTION usp_UpdateClassType(
    classtypeid_param              SMALLINT,
    fieldid_param                  SMALLINT,
    classname_param                TEXT,
    judgingsheetformat_param       TEXT,
    qualificationdescription_param TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE classtype SET
        fieldid                  = fieldid_param,
        classname                = classname_param,
        judgingsheetformat       = judgingsheetformat_param,
        qualificationdescription = qualificationdescription_param
    WHERE classtypeid = classtypeid_param;
END;
$$;


-- Delete class type (with validation)
DROP FUNCTION IF EXISTS usp_DeleteClassType(SMALLINT) CASCADE;
CREATE OR REPLACE FUNCTION usp_DeleteClassType(
    classtypeid_param SMALLINT
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM classincompetition cic WHERE cic.classtypeid = classtypeid_param) THEN
        RAISE EXCEPTION 'Cannot delete class type: It is already used in existing or historical competitions.';
    END IF;
    DELETE FROM classtype WHERE classtypeid = classtypeid_param;
END;
$$;


-- ============================================================
-- JUDGES
-- ============================================================

-- Get all judges (optionally filtered by field)
DROP FUNCTION IF EXISTS usp_GetAllJudges(SMALLINT) CASCADE;
CREATE OR REPLACE FUNCTION usp_GetAllJudges(
    fieldid_param SMALLINT DEFAULT NULL
)
RETURNS TABLE(
    "JudgeId"          INTEGER,
    "FirstNameHebrew"  VARCHAR,
    "LastNameHebrew"   VARCHAR,
    "FirstNameEnglish" VARCHAR,
    "LastNameEnglish"  VARCHAR,
    "Country"          VARCHAR,
    "QualifiedFields"  VARCHAR
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT
        j.judgeid,
        j.firstnamehebrew,
        j.lastnamehebrew,
        j.firstnameenglish,
        j.lastnameenglish,
        j.country,
        (
            SELECT string_agg(f2.fieldname, ', ')
            FROM judgefield jf2
            INNER JOIN field f2 ON jf2.fieldid = f2.fieldid
            WHERE jf2.judgeid = j.judgeid
        )
    FROM judge j
    WHERE (fieldid_param IS NULL OR EXISTS (
        SELECT 1 FROM judgefield jf WHERE jf.judgeid = j.judgeid AND jf.fieldid = fieldid_param
    ))
    ORDER BY j.firstnamehebrew ASC;
END;
$$;


-- Insert judge (basic, without field assignment)
DROP FUNCTION IF EXISTS usp_InsertJudge(TEXT, TEXT, TEXT, TEXT, TEXT) CASCADE;
CREATE OR REPLACE FUNCTION usp_InsertJudge(
    firstnamehebrew_param  TEXT,
    lastnamehebrew_param   TEXT,
    firstnameenglish_param TEXT,
    lastnameenglish_param  TEXT,
    country_param          TEXT
)
RETURNS TABLE("NewJudgeId" INTEGER)
LANGUAGE plpgsql AS $$
DECLARE
    v_new_id INTEGER;
BEGIN
    INSERT INTO judge (firstnamehebrew, lastnamehebrew, firstnameenglish, lastnameenglish, country)
    VALUES (firstnamehebrew_param, lastnamehebrew_param, firstnameenglish_param, lastnameenglish_param, country_param)
    RETURNING judgeid INTO v_new_id;

    RETURN QUERY SELECT v_new_id AS "NewJudgeId";
END;
$$;


-- Insert judge with field assignments (CSV of field IDs)
DROP FUNCTION IF EXISTS usp_InsertJudgeWithFields(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) CASCADE;
CREATE OR REPLACE FUNCTION usp_InsertJudgeWithFields(
    firstnamehebrew_param  TEXT,
    lastnamehebrew_param   TEXT,
    firstnameenglish_param TEXT,
    lastnameenglish_param  TEXT,
    country_param          TEXT,
    fieldidscsv_param      TEXT
)
RETURNS TABLE("NewJudgeId" INTEGER)
LANGUAGE plpgsql AS $$
DECLARE
    v_new_id INTEGER;
BEGIN
    IF fieldidscsv_param IS NULL OR TRIM(fieldidscsv_param) = '' THEN
        RAISE EXCEPTION 'Cannot create judge: At least one field must be provided.';
    END IF;

    INSERT INTO judge (firstnamehebrew, lastnamehebrew, firstnameenglish, lastnameenglish, country)
    VALUES (firstnamehebrew_param, lastnamehebrew_param, firstnameenglish_param, lastnameenglish_param, country_param)
    RETURNING judgeid INTO v_new_id;

    INSERT INTO judgefield (judgeid, fieldid)
    SELECT v_new_id, CAST(TRIM(val) AS SMALLINT)
    FROM unnest(string_to_array(fieldidscsv_param, ',')) AS val;

    RETURN QUERY SELECT v_new_id AS "NewJudgeId";
END;
$$;


-- Update judge and reassign fields (CSV of field IDs)
DROP FUNCTION IF EXISTS usp_UpdateJudge(INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) CASCADE;
CREATE OR REPLACE FUNCTION usp_UpdateJudge(
    judgeid_param          INTEGER,
    firstnamehebrew_param  TEXT,
    lastnamehebrew_param   TEXT,
    firstnameenglish_param TEXT,
    lastnameenglish_param  TEXT,
    country_param          TEXT,
    fieldidscsv_param      TEXT
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    IF fieldidscsv_param IS NULL OR TRIM(fieldidscsv_param) = '' THEN
        RAISE EXCEPTION 'Cannot update judge: At least one field must be provided.';
    END IF;

    UPDATE judge SET
        firstnamehebrew  = firstnamehebrew_param,
        lastnamehebrew   = lastnamehebrew_param,
        firstnameenglish = firstnameenglish_param,
        lastnameenglish  = lastnameenglish_param,
        country          = country_param
    WHERE judgeid = judgeid_param;

    DELETE FROM judgefield WHERE judgeid = judgeid_param;

    INSERT INTO judgefield (judgeid, fieldid)
    SELECT judgeid_param, CAST(TRIM(val) AS SMALLINT)
    FROM unnest(string_to_array(fieldidscsv_param, ',')) AS val;
END;
$$;


-- Delete judge (with validation)
DROP FUNCTION IF EXISTS usp_DeleteJudge(INTEGER) CASCADE;
CREATE OR REPLACE FUNCTION usp_DeleteJudge(
    judgeid_param INTEGER
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM classjudge cj WHERE cj.judgeid = judgeid_param) THEN
        RAISE EXCEPTION 'Cannot delete judge: Judge is assigned to specific classes.';
    END IF;

    DELETE FROM judgefield WHERE judgeid = judgeid_param;
    DELETE FROM judge WHERE judgeid = judgeid_param;
END;
$$;


-- Add judge to a field
DROP FUNCTION IF EXISTS usp_AddJudgeToField(INTEGER, SMALLINT) CASCADE;
CREATE OR REPLACE FUNCTION usp_AddJudgeToField(
    judgeid_param INTEGER,
    fieldid_param SMALLINT
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM judgefield jf WHERE jf.judgeid = judgeid_param AND jf.fieldid = fieldid_param) THEN
        RAISE EXCEPTION 'Cannot add field: Judge is already assigned to this field.';
    END IF;

    INSERT INTO judgefield (judgeid, fieldid) VALUES (judgeid_param, fieldid_param);
END;
$$;


-- Remove judge from a field
DROP FUNCTION IF EXISTS usp_RemoveJudgeFromField(INTEGER, SMALLINT) CASCADE;
CREATE OR REPLACE FUNCTION usp_RemoveJudgeFromField(
    judgeid_param INTEGER,
    fieldid_param SMALLINT
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    DELETE FROM judgefield WHERE judgeid = judgeid_param AND fieldid = fieldid_param;
END;
$$;


-- ============================================================
-- PRIZE TYPES
-- ============================================================

-- Insert prize type
DROP FUNCTION IF EXISTS usp_InsertPrizeType(TEXT, TEXT) CASCADE;
CREATE OR REPLACE FUNCTION usp_InsertPrizeType(
    prizetypename_param   TEXT,
    prizedescription_param TEXT DEFAULT NULL
)
RETURNS TABLE("NewPrizeTypeId" SMALLINT)
LANGUAGE plpgsql AS $$
DECLARE
    v_new_id SMALLINT;
BEGIN
    INSERT INTO prizetype (prizetypename, prizedescription)
    VALUES (prizetypename_param, prizedescription_param)
    RETURNING prizetypeid INTO v_new_id;

    RETURN QUERY SELECT v_new_id AS "NewPrizeTypeId";
END;
$$;


-- Update prize type
DROP FUNCTION IF EXISTS usp_UpdatePrizeType(SMALLINT, TEXT, TEXT) CASCADE;
CREATE OR REPLACE FUNCTION usp_UpdatePrizeType(
    prizetypeid_param     SMALLINT,
    prizetypename_param   TEXT,
    prizedescription_param TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE prizetype SET
        prizetypename   = prizetypename_param,
        prizedescription = prizedescription_param
    WHERE prizetypeid = prizetypeid_param;
END;
$$;


-- Delete prize type (with validation)
DROP FUNCTION IF EXISTS usp_DeletePrizeType(SMALLINT) CASCADE;
CREATE OR REPLACE FUNCTION usp_DeletePrizeType(
    prizetypeid_param SMALLINT
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM classprize cp WHERE cp.prizetypeid = prizetypeid_param) THEN
        RAISE EXCEPTION 'Cannot delete prize type: It is already associated with existing or historical classes.';
    END IF;
    DELETE FROM prizetype WHERE prizetypeid = prizetypeid_param;
END;
$$;


-- ============================================================
-- FINES
-- ============================================================

-- Get all fines
DROP FUNCTION IF EXISTS usp_GetAllFines() CASCADE;
CREATE OR REPLACE FUNCTION usp_GetAllFines()
RETURNS TABLE(
    "FineId"          INTEGER,
    "FineName"        VARCHAR,
    "FineDescription" VARCHAR,
    "FineAmount"      NUMERIC(10,2)
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT f.fineid, f.finename, f.finedescription, f.fineamount
    FROM fine f ORDER BY f.finename ASC;
END;
$$;


-- Insert fine
DROP FUNCTION IF EXISTS usp_InsertFine(TEXT, NUMERIC, TEXT) CASCADE;
CREATE OR REPLACE FUNCTION usp_InsertFine(
    finename_param        TEXT,
    fineamount_param      NUMERIC(10,2),
    finedescription_param TEXT DEFAULT NULL
)
RETURNS TABLE("NewFineId" INTEGER)
LANGUAGE plpgsql AS $$
DECLARE
    v_new_id INTEGER;
BEGIN
    INSERT INTO fine (finename, finedescription, fineamount)
    VALUES (finename_param, finedescription_param, fineamount_param)
    RETURNING fineid INTO v_new_id;

    RETURN QUERY SELECT v_new_id AS "NewFineId";
END;
$$;


-- Update fine
DROP FUNCTION IF EXISTS usp_UpdateFine(INTEGER, TEXT, NUMERIC, TEXT) CASCADE;
CREATE OR REPLACE FUNCTION usp_UpdateFine(
    fineid_param          INTEGER,
    finename_param        TEXT,
    fineamount_param      NUMERIC(10,2),
    finedescription_param TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE fine SET
        finename        = finename_param,
        finedescription = finedescription_param,
        fineamount      = fineamount_param
    WHERE fineid = fineid_param;
END;
$$;


-- Delete fine
DROP FUNCTION IF EXISTS usp_DeleteFine(INTEGER) CASCADE;
CREATE OR REPLACE FUNCTION usp_DeleteFine(
    fineid_param INTEGER
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    DELETE FROM fine WHERE fineid = fineid_param;
END;
$$;


-- ============================================================
-- PERSON MANAGEMENT
-- ============================================================

-- Check if national ID exists
DROP FUNCTION IF EXISTS usp_CheckNationalIdExists(TEXT) CASCADE;
CREATE OR REPLACE FUNCTION usp_CheckNationalIdExists(
    nationalid_param TEXT
)
RETURNS TABLE("ExistsFlag" INTEGER)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT CASE WHEN EXISTS (
        SELECT 1 FROM person p WHERE p.nationalid = nationalid_param
    ) THEN 1 ELSE 0 END AS "ExistsFlag";
END;
$$;


-- Assign person role at ranch
DROP FUNCTION IF EXISTS usp_AssignPersonRoleAtRanch(INTEGER, INTEGER, SMALLINT, TEXT) CASCADE;
CREATE OR REPLACE FUNCTION usp_AssignPersonRoleAtRanch(
    personid_param   INTEGER,
    ranchid_param    INTEGER,
    roleid_param     SMALLINT,
    rolestatus_param TEXT DEFAULT 'Pending'
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    IF rolestatus_param NOT IN ('Pending', 'Approved', 'Rejected') THEN
        RAISE EXCEPTION 'Invalid RoleStatus';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM person p WHERE p.personid = personid_param) THEN
        RAISE EXCEPTION 'Person does not exist';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM ranch r WHERE r.ranchid = ranchid_param) THEN
        RAISE EXCEPTION 'Ranch does not exist';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM role r WHERE r.roleid = roleid_param) THEN
        RAISE EXCEPTION 'Role does not exist';
    END IF;

    INSERT INTO personranch (personid, ranchid) VALUES (personid_param, ranchid_param)
    ON CONFLICT DO NOTHING;

    IF NOT EXISTS (
        SELECT 1 FROM personranchrole prr
        WHERE prr.personid = personid_param AND prr.ranchid = ranchid_param AND prr.roleid = roleid_param
    ) THEN
        INSERT INTO personranchrole (personid, ranchid, roleid, rolestatus)
        VALUES (personid_param, ranchid_param, roleid_param, rolestatus_param);
    ELSE
        UPDATE personranchrole SET rolestatus = rolestatus_param
        WHERE personid = personid_param AND ranchid = ranchid_param AND roleid = roleid_param;
    END IF;
END;
$$;


-- Update person role status
DROP FUNCTION IF EXISTS usp_UpdatePersonRoleStatus(INTEGER, INTEGER, SMALLINT, TEXT) CASCADE;
CREATE OR REPLACE FUNCTION usp_UpdatePersonRoleStatus(
    personid_param   INTEGER,
    ranchid_param    INTEGER,
    roleid_param     SMALLINT,
    rolestatus_param TEXT
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    IF rolestatus_param NOT IN ('Pending', 'Approved', 'Rejected') THEN
        RAISE EXCEPTION 'Invalid RoleStatus';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM personranchrole prr
        WHERE prr.personid = personid_param AND prr.ranchid = ranchid_param AND prr.roleid = roleid_param
    ) THEN
        RAISE EXCEPTION 'PersonRanchRole does not exist';
    END IF;

    UPDATE personranchrole SET rolestatus = rolestatus_param
    WHERE personid = personid_param AND ranchid = ranchid_param AND roleid = roleid_param;
END;
$$;


-- Set must change password flag
DROP FUNCTION IF EXISTS usp_SetMustChangePassword(INTEGER, BOOLEAN) CASCADE;
CREATE OR REPLACE FUNCTION usp_SetMustChangePassword(
    systemuserid_param       INTEGER,
    mustchangepassword_param BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE systemuser SET mustchangepassword = mustchangepassword_param
    WHERE systemuserid = systemuserid_param;
END;
$$;


-- Toggle system user active status
DROP FUNCTION IF EXISTS usp_ToggleSystemUserStatus(INTEGER, BOOLEAN) CASCADE;
CREATE OR REPLACE FUNCTION usp_ToggleSystemUserStatus(
    systemuserid_param INTEGER,
    isactive_param     BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE systemuser SET isactive = isactive_param
    WHERE systemuserid = systemuserid_param;
END;
$$;
