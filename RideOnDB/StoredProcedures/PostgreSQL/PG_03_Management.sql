-- ============================================================
-- FILE 3: MANAGEMENT MODULE (PostgreSQL / Supabase)
-- Covers: Ranch, SuperUser, Fields, Judges, Person, Roles
-- Run this in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- RANCH
-- ============================================================

-- Insert new ranch
CREATE OR REPLACE FUNCTION usp_InsertRanch(
    "RanchName"    TEXT,
    "ContactEmail" TEXT    DEFAULT NULL,
    "ContactPhone" TEXT    DEFAULT NULL,
    "WebsiteUrl"   TEXT    DEFAULT NULL,
    "Lat"          DOUBLE PRECISION DEFAULT NULL,
    "Long"         DOUBLE PRECISION DEFAULT NULL
)
RETURNS TABLE("NewRanchId" INTEGER)
LANGUAGE plpgsql AS $$
DECLARE
    v_new_id  INTEGER;
    v_geog    geography := NULL;
BEGIN
    IF "Lat" IS NOT NULL AND "Long" IS NOT NULL THEN
        v_geog := ST_SetSRID(ST_MakePoint("Long", "Lat"), 4326)::geography;
    END IF;

    INSERT INTO ranch (ranchname, contactemail, contactphone, websiteurl, location, ranchstatus)
    VALUES ("RanchName", "ContactEmail", "ContactPhone", "WebsiteUrl", v_geog, 'Pending')
    RETURNING ranchid INTO v_new_id;

    RETURN QUERY SELECT v_new_id AS "NewRanchId";
END;
$$;


-- Insert new ranch request
CREATE OR REPLACE FUNCTION usp_InsertNewRanchRequest(
    "RanchId"                 INTEGER,
    "SubmittedBySystemUserId" INTEGER
)
RETURNS TABLE("NewRequestId" INTEGER)
LANGUAGE plpgsql AS $$
DECLARE
    v_new_id INTEGER;
BEGIN
    INSERT INTO newranchrequest (ranchid, submittedbysystemuserid)
    VALUES ("RanchId", "SubmittedBySystemUserId")
    RETURNING requestid INTO v_new_id;

    RETURN QUERY SELECT v_new_id AS "NewRequestId";
END;
$$;


-- Update ranch request status (and update ranch status accordingly)
CREATE OR REPLACE FUNCTION usp_UpdateNewRanchRequestStatus(
    "RequestId"            INTEGER,
    "ResolvedBySuperUserId" INTEGER,
    "NewStatus"            TEXT
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE newranchrequest SET
        requeststatus         = "NewStatus",
        resolvedbysuperuserid = "ResolvedBySuperUserId",
        resolveddate          = NOW()
    WHERE requestid = "RequestId";

    UPDATE ranch r SET
        ranchstatus = "NewStatus"
    FROM newranchrequest nrr
    WHERE r.ranchid = nrr.ranchid
      AND nrr.requestid = "RequestId";
END;
$$;


-- Update ranch details
CREATE OR REPLACE FUNCTION usp_UpdateRanch(
    "RanchId"    INTEGER,
    "RanchName"  TEXT,
    "ContactEmail" TEXT DEFAULT NULL,
    "ContactPhone" TEXT DEFAULT NULL,
    "WebsiteUrl"   TEXT DEFAULT NULL,
    "Latitude"     DOUBLE PRECISION DEFAULT NULL,
    "Longitude"    DOUBLE PRECISION DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql AS $$
DECLARE
    v_geog geography := NULL;
BEGIN
    IF "Latitude" IS NOT NULL AND "Longitude" IS NOT NULL THEN
        v_geog := ST_SetSRID(ST_MakePoint("Longitude", "Latitude"), 4326)::geography;
    END IF;

    UPDATE ranch SET
        ranchname    = "RanchName",
        contactemail = "ContactEmail",
        contactphone = "ContactPhone",
        websiteurl   = "WebsiteUrl",
        location     = v_geog
    WHERE ranchid = "RanchId";
END;
$$;


-- Get ranch by ID
CREATE OR REPLACE FUNCTION usp_GetRanchById(
    "RanchId" INTEGER
)
RETURNS TABLE(
    "RanchId"      INTEGER,
    "RanchName"    TEXT,
    "ContactEmail" TEXT,
    "ContactPhone" TEXT,
    "WebsiteUrl"   TEXT,
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
    WHERE r.ranchid = "RanchId";
END;
$$;


-- Get all ranches for a user
CREATE OR REPLACE FUNCTION usp_GetAllRanchesByUserId(
    "UserId" INTEGER
)
RETURNS TABLE(
    "RanchId"      INTEGER,
    "RanchName"    TEXT,
    "ContactEmail" TEXT,
    "ContactPhone" TEXT,
    "WebsiteUrl"   TEXT,
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
    WHERE pr.personid   = "UserId"
      AND r.ranchstatus = 'Approved';
END;
$$;


-- ============================================================
-- SUPER USER
-- ============================================================

-- Insert super user
CREATE OR REPLACE FUNCTION usp_InsertSuperUser(
    "Email"              TEXT,
    "PasswordHash"       TEXT,
    "PasswordSalt"       TEXT,
    "MustChangePassword" BOOLEAN DEFAULT TRUE
)
RETURNS TABLE("NewSuperUserId" INTEGER)
LANGUAGE plpgsql AS $$
DECLARE
    v_new_id INTEGER;
BEGIN
    INSERT INTO superuser (email, passwordhash, passwordsalt, mustchangepassword)
    VALUES ("Email", "PasswordHash", "PasswordSalt", "MustChangePassword")
    RETURNING superuserid INTO v_new_id;

    RETURN QUERY SELECT v_new_id AS "NewSuperUserId";
END;
$$;


-- Get all super users
CREATE OR REPLACE FUNCTION usp_GetAllSuperUsers()
RETURNS TABLE(
    "SuperUserId"        INTEGER,
    "Email"              TEXT,
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
CREATE OR REPLACE FUNCTION usp_GetSuperUserById(
    "SuperUserId" INTEGER
)
RETURNS TABLE(
    "SuperUserId"        INTEGER,
    "Email"              TEXT,
    "PasswordHash"       TEXT,
    "PasswordSalt"       TEXT,
    "IsActive"           BOOLEAN,
    "MustChangePassword" BOOLEAN
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT su.superuserid, su.email, su.passwordhash, su.passwordsalt,
           su.isactive, su.mustchangepassword
    FROM superuser su
    WHERE su.superuserid = "SuperUserId";
END;
$$;


-- Get super user for login
CREATE OR REPLACE FUNCTION usp_GetSuperUserForLogin(
    "Email" TEXT
)
RETURNS TABLE(
    "SuperUserId"        INTEGER,
    "Email"              TEXT,
    "PasswordHash"       TEXT,
    "PasswordSalt"       TEXT,
    "IsActive"           BOOLEAN,
    "MustChangePassword" BOOLEAN
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT su.superuserid, su.email, su.passwordhash, su.passwordsalt,
           su.isactive, su.mustchangepassword
    FROM superuser su
    WHERE su.email = "Email";
END;
$$;


-- Update super user last login timestamp
CREATE OR REPLACE FUNCTION usp_UpdateSuperUserLastLogin(
    "SuperUserId" INTEGER
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE superuser SET lastlogindate = NOW()
    WHERE superuserid = "SuperUserId";
END;
$$;


-- Update super user password
CREATE OR REPLACE FUNCTION usp_UpdateSuperUserPassword(
    "SuperUserId"    INTEGER,
    "NewPasswordHash" TEXT,
    "NewPasswordSalt" TEXT
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE superuser SET
        passwordhash       = "NewPasswordHash",
        passwordsalt       = "NewPasswordSalt",
        mustchangepassword = FALSE
    WHERE superuserid = "SuperUserId"
      AND isactive    = TRUE;
END;
$$;


-- Check if super user email exists
CREATE OR REPLACE FUNCTION usp_CheckSuperUserEmailExists(
    "Email" TEXT
)
RETURNS TABLE("ExistsFlag" INTEGER)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT CASE WHEN EXISTS (
        SELECT 1 FROM superuser su WHERE su.email = "Email"
    ) THEN 1 ELSE 0 END AS "ExistsFlag";
END;
$$;


-- Get role requests (super user view)
CREATE OR REPLACE FUNCTION usp_GetRoleRequests(
    "RoleId"     SMALLINT,
    "RoleStatus" TEXT DEFAULT NULL,
    "SearchText" TEXT DEFAULT NULL
)
RETURNS TABLE(
    "PersonId"   INTEGER,
    "RanchId"    INTEGER,
    "RoleId"     SMALLINT,
    "FullName"   TEXT,
    "NationalId" TEXT,
    "Email"      TEXT,
    "CellPhone"  TEXT,
    "RanchName"  TEXT,
    "RoleName"   TEXT,
    "RoleStatus" TEXT
)
LANGUAGE plpgsql AS $$
BEGIN
    IF "RoleStatus" IS NOT NULL AND "RoleStatus" NOT IN ('Pending', 'Approved', 'Rejected') THEN
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
    WHERE prr.roleid = "RoleId"
      AND ("RoleStatus" IS NULL OR prr.rolestatus = "RoleStatus")
      AND (
            "SearchText" IS NULL OR TRIM("SearchText") = ''
            OR (p.firstname || ' ' || p.lastname) ILIKE '%' || "SearchText" || '%'
            OR p.nationalid ILIKE '%' || "SearchText" || '%'
            OR COALESCE(p.email, '') ILIKE '%' || "SearchText" || '%'
            OR COALESCE(p.cellphone, '') ILIKE '%' || "SearchText" || '%'
            OR r.ranchname ILIKE '%' || "SearchText" || '%'
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
CREATE OR REPLACE FUNCTION usp_GetNewRanchRequests(
    "RequestStatus" TEXT DEFAULT NULL,
    "SearchText"    TEXT DEFAULT NULL
)
RETURNS TABLE(
    "RequestId"               INTEGER,
    "RanchId"                 INTEGER,
    "SubmittedBySystemUserId" INTEGER,
    "RequestDate"             TIMESTAMP,
    "RanchName"               TEXT,
    "PersonId"                INTEGER,
    "FullName"                TEXT,
    "NationalId"              TEXT,
    "Email"                   TEXT,
    "CellPhone"               TEXT,
    "RequestStatus"           TEXT,
    "ResolvedBySuperUserId"   INTEGER,
    "ResolvedBySuperUserEmail" TEXT,
    "ResolvedDate"            TIMESTAMP
)
LANGUAGE plpgsql AS $$
BEGIN
    IF "RequestStatus" IS NOT NULL AND "RequestStatus" NOT IN ('Pending', 'Approved', 'Rejected') THEN
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
    WHERE ("RequestStatus" IS NULL OR nrr.requeststatus = "RequestStatus")
      AND (
            "SearchText" IS NULL OR TRIM("SearchText") = ''
            OR r.ranchname ILIKE '%' || "SearchText" || '%'
            OR (p.firstname || ' ' || p.lastname) ILIKE '%' || "SearchText" || '%'
            OR p.nationalid ILIKE '%' || "SearchText" || '%'
            OR COALESCE(p.email, '') ILIKE '%' || "SearchText" || '%'
            OR COALESCE(p.cellphone, '') ILIKE '%' || "SearchText" || '%'
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
CREATE OR REPLACE FUNCTION usp_GetPendingRoleRequests(
    "RoleId" SMALLINT
)
RETURNS TABLE(
    "PersonId"   INTEGER,
    "RanchId"    INTEGER,
    "RoleId"     SMALLINT,
    "FullName"   TEXT,
    "IdNumber"   TEXT,
    "Email"      TEXT,
    "PhoneNumber" TEXT,
    "RanchName"  TEXT,
    "RoleStatus" TEXT
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
      AND prr.roleid     = "RoleId"
    ORDER BY p.firstname;
END;
$$;


-- Get pending new ranch requests (ranch admin view)
CREATE OR REPLACE FUNCTION usp_GetPendingNewRanchRequests()
RETURNS TABLE(
    "RequestId"     INTEGER,
    "RequestDate"   TIMESTAMP,
    "RanchName"     TEXT,
    "FullName"      TEXT,
    "NationalId"    TEXT,
    "Email"         TEXT,
    "RequestStatus" TEXT
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
CREATE OR REPLACE FUNCTION usp_GetAllFields()
RETURNS TABLE("FieldId" SMALLINT, "FieldName" TEXT)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT f.fieldid, f.fieldname FROM field f ORDER BY f.fieldname;
END;
$$;


-- Insert field
CREATE OR REPLACE FUNCTION usp_InsertField(
    "FieldName" TEXT
)
RETURNS TABLE("NewFieldId" SMALLINT)
LANGUAGE plpgsql AS $$
DECLARE
    v_new_id SMALLINT;
BEGIN
    INSERT INTO field (fieldname) VALUES ("FieldName")
    RETURNING fieldid INTO v_new_id;

    RETURN QUERY SELECT v_new_id AS "NewFieldId";
END;
$$;


-- Update field
CREATE OR REPLACE FUNCTION usp_UpdateField(
    "FieldId"   SMALLINT,
    "FieldName" TEXT
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE field SET fieldname = "FieldName" WHERE fieldid = "FieldId";
END;
$$;


-- Delete field (with validation)
CREATE OR REPLACE FUNCTION usp_DeleteField(
    "FieldId" SMALLINT
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM competition c WHERE c.fieldid = "FieldId") THEN
        RAISE EXCEPTION 'Cannot delete field: There are competitions associated with this field.';
    END IF;
    IF EXISTS (SELECT 1 FROM classtype ct WHERE ct.fieldid = "FieldId") THEN
        RAISE EXCEPTION 'Cannot delete field: There are class types associated with this field.';
    END IF;
    IF EXISTS (SELECT 1 FROM judgefield jf WHERE jf.fieldid = "FieldId") THEN
        RAISE EXCEPTION 'Cannot delete field: There are judges qualified for this field.';
    END IF;

    DELETE FROM field WHERE fieldid = "FieldId";
END;
$$;


-- ============================================================
-- CLASS TYPES
-- ============================================================

-- Insert class type
CREATE OR REPLACE FUNCTION usp_InsertClassType(
    "FieldId"                  SMALLINT,
    "ClassName"                TEXT,
    "JudgingSheetFormat"       TEXT,
    "QualificationDescription" TEXT DEFAULT NULL
)
RETURNS TABLE("NewClassTypeId" SMALLINT)
LANGUAGE plpgsql AS $$
DECLARE
    v_new_id SMALLINT;
BEGIN
    INSERT INTO classtype (fieldid, classname, judgingsheetformat, qualificationdescription)
    VALUES ("FieldId", "ClassName", "JudgingSheetFormat", "QualificationDescription")
    RETURNING classtypeid INTO v_new_id;

    RETURN QUERY SELECT v_new_id AS "NewClassTypeId";
END;
$$;


-- Update class type
CREATE OR REPLACE FUNCTION usp_UpdateClassType(
    "ClassTypeId"              SMALLINT,
    "FieldId"                  SMALLINT,
    "ClassName"                TEXT,
    "JudgingSheetFormat"       TEXT,
    "QualificationDescription" TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE classtype SET
        fieldid                  = "FieldId",
        classname                = "ClassName",
        judgingsheetformat       = "JudgingSheetFormat",
        qualificationdescription = "QualificationDescription"
    WHERE classtypeid = "ClassTypeId";
END;
$$;


-- Delete class type (with validation)
CREATE OR REPLACE FUNCTION usp_DeleteClassType(
    "ClassTypeId" SMALLINT
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM classincompetition cic WHERE cic.classtypeid = "ClassTypeId") THEN
        RAISE EXCEPTION 'Cannot delete class type: It is already used in existing or historical competitions.';
    END IF;
    DELETE FROM classtype WHERE classtypeid = "ClassTypeId";
END;
$$;


-- ============================================================
-- JUDGES
-- ============================================================

-- Get all judges (optionally filtered by field)
CREATE OR REPLACE FUNCTION usp_GetAllJudges(
    "FieldId" SMALLINT DEFAULT NULL
)
RETURNS TABLE(
    "JudgeId"          INTEGER,
    "FirstNameHebrew"  TEXT,
    "LastNameHebrew"   TEXT,
    "FirstNameEnglish" TEXT,
    "LastNameEnglish"  TEXT,
    "Country"          TEXT,
    "QualifiedFields"  TEXT
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
    WHERE ("FieldId" IS NULL OR EXISTS (
        SELECT 1 FROM judgefield jf WHERE jf.judgeid = j.judgeid AND jf.fieldid = "FieldId"
    ))
    ORDER BY j.firstnamehebrew ASC;
END;
$$;


-- Insert judge (basic, without field assignment)
CREATE OR REPLACE FUNCTION usp_InsertJudge(
    "FirstNameHebrew"  TEXT,
    "LastNameHebrew"   TEXT,
    "FirstNameEnglish" TEXT,
    "LastNameEnglish"  TEXT,
    "Country"          TEXT
)
RETURNS TABLE("NewJudgeId" INTEGER)
LANGUAGE plpgsql AS $$
DECLARE
    v_new_id INTEGER;
BEGIN
    INSERT INTO judge (firstnamehebrew, lastnamehebrew, firstnameenglish, lastnameenglish, country)
    VALUES ("FirstNameHebrew", "LastNameHebrew", "FirstNameEnglish", "LastNameEnglish", "Country")
    RETURNING judgeid INTO v_new_id;

    RETURN QUERY SELECT v_new_id AS "NewJudgeId";
END;
$$;


-- Insert judge with field assignments (CSV of field IDs)
CREATE OR REPLACE FUNCTION usp_InsertJudgeWithFields(
    "FirstNameHebrew"  TEXT,
    "LastNameHebrew"   TEXT,
    "FirstNameEnglish" TEXT,
    "LastNameEnglish"  TEXT,
    "Country"          TEXT,
    "FieldIdsCsv"      TEXT
)
RETURNS TABLE("NewJudgeId" INTEGER)
LANGUAGE plpgsql AS $$
DECLARE
    v_new_id INTEGER;
BEGIN
    IF "FieldIdsCsv" IS NULL OR TRIM("FieldIdsCsv") = '' THEN
        RAISE EXCEPTION 'Cannot create judge: At least one field must be provided.';
    END IF;

    INSERT INTO judge (firstnamehebrew, lastnamehebrew, firstnameenglish, lastnameenglish, country)
    VALUES ("FirstNameHebrew", "LastNameHebrew", "FirstNameEnglish", "LastNameEnglish", "Country")
    RETURNING judgeid INTO v_new_id;

    INSERT INTO judgefield (judgeid, fieldid)
    SELECT v_new_id, CAST(TRIM(val) AS SMALLINT)
    FROM unnest(string_to_array("FieldIdsCsv", ',')) AS val;

    RETURN QUERY SELECT v_new_id AS "NewJudgeId";
END;
$$;


-- Update judge and reassign fields (CSV of field IDs)
CREATE OR REPLACE FUNCTION usp_UpdateJudge(
    "JudgeId"          INTEGER,
    "FirstNameHebrew"  TEXT,
    "LastNameHebrew"   TEXT,
    "FirstNameEnglish" TEXT,
    "LastNameEnglish"  TEXT,
    "Country"          TEXT,
    "FieldIdsCsv"      TEXT
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    IF "FieldIdsCsv" IS NULL OR TRIM("FieldIdsCsv") = '' THEN
        RAISE EXCEPTION 'Cannot update judge: At least one field must be provided.';
    END IF;

    UPDATE judge SET
        firstnamehebrew  = "FirstNameHebrew",
        lastnamehebrew   = "LastNameHebrew",
        firstnameenglish = "FirstNameEnglish",
        lastnameenglish  = "LastNameEnglish",
        country          = "Country"
    WHERE judgeid = "JudgeId";

    DELETE FROM judgefield WHERE judgeid = "JudgeId";

    INSERT INTO judgefield (judgeid, fieldid)
    SELECT "JudgeId", CAST(TRIM(val) AS SMALLINT)
    FROM unnest(string_to_array("FieldIdsCsv", ',')) AS val;
END;
$$;


-- Delete judge (with validation)
CREATE OR REPLACE FUNCTION usp_DeleteJudge(
    "JudgeId" INTEGER
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM classjudge cj WHERE cj.judgeid = "JudgeId") THEN
        RAISE EXCEPTION 'Cannot delete judge: Judge is assigned to specific classes.';
    END IF;

    DELETE FROM judgefield WHERE judgeid = "JudgeId";
    DELETE FROM judge WHERE judgeid = "JudgeId";
END;
$$;


-- Add judge to a field
CREATE OR REPLACE FUNCTION usp_AddJudgeToField(
    "JudgeId" INTEGER,
    "FieldId" SMALLINT
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM judgefield jf WHERE jf.judgeid = "JudgeId" AND jf.fieldid = "FieldId") THEN
        RAISE EXCEPTION 'Cannot add field: Judge is already assigned to this field.';
    END IF;

    INSERT INTO judgefield (judgeid, fieldid) VALUES ("JudgeId", "FieldId");
END;
$$;


-- Remove judge from a field
CREATE OR REPLACE FUNCTION usp_RemoveJudgeFromField(
    "JudgeId" INTEGER,
    "FieldId" SMALLINT
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    DELETE FROM judgefield WHERE judgeid = "JudgeId" AND fieldid = "FieldId";
END;
$$;


-- ============================================================
-- PRIZE TYPES
-- ============================================================

-- Insert prize type
CREATE OR REPLACE FUNCTION usp_InsertPrizeType(
    "PrizeTypeName"   TEXT,
    "PrizeDescription" TEXT DEFAULT NULL
)
RETURNS TABLE("NewPrizeTypeId" SMALLINT)
LANGUAGE plpgsql AS $$
DECLARE
    v_new_id SMALLINT;
BEGIN
    INSERT INTO prizetype (prizetypename, prizedescription)
    VALUES ("PrizeTypeName", "PrizeDescription")
    RETURNING prizetypeid INTO v_new_id;

    RETURN QUERY SELECT v_new_id AS "NewPrizeTypeId";
END;
$$;


-- Update prize type
CREATE OR REPLACE FUNCTION usp_UpdatePrizeType(
    "PrizeTypeId"     SMALLINT,
    "PrizeTypeName"   TEXT,
    "PrizeDescription" TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE prizetype SET
        prizetypename   = "PrizeTypeName",
        prizedescription = "PrizeDescription"
    WHERE prizetypeid = "PrizeTypeId";
END;
$$;


-- Delete prize type (with validation)
CREATE OR REPLACE FUNCTION usp_DeletePrizeType(
    "PrizeTypeId" SMALLINT
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM classprize cp WHERE cp.prizetypeid = "PrizeTypeId") THEN
        RAISE EXCEPTION 'Cannot delete prize type: It is already associated with existing or historical classes.';
    END IF;
    DELETE FROM prizetype WHERE prizetypeid = "PrizeTypeId";
END;
$$;


-- ============================================================
-- FINES
-- ============================================================

-- Get all fines
CREATE OR REPLACE FUNCTION usp_GetAllFines()
RETURNS TABLE(
    "FineId"          INTEGER,
    "FineName"        TEXT,
    "FineDescription" TEXT,
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
CREATE OR REPLACE FUNCTION usp_InsertFine(
    "FineName"        TEXT,
    "FineDescription" TEXT DEFAULT NULL,
    "FineAmount"      NUMERIC(10,2)
)
RETURNS TABLE("NewFineId" INTEGER)
LANGUAGE plpgsql AS $$
DECLARE
    v_new_id INTEGER;
BEGIN
    INSERT INTO fine (finename, finedescription, fineamount)
    VALUES ("FineName", "FineDescription", "FineAmount")
    RETURNING fineid INTO v_new_id;

    RETURN QUERY SELECT v_new_id AS "NewFineId";
END;
$$;


-- Update fine
CREATE OR REPLACE FUNCTION usp_UpdateFine(
    "FineId"          INTEGER,
    "FineName"        TEXT,
    "FineDescription" TEXT DEFAULT NULL,
    "FineAmount"      NUMERIC(10,2)
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE fine SET
        finename        = "FineName",
        finedescription = "FineDescription",
        fineamount      = "FineAmount"
    WHERE fineid = "FineId";
END;
$$;


-- Delete fine
CREATE OR REPLACE FUNCTION usp_DeleteFine(
    "FineId" INTEGER
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    DELETE FROM fine WHERE fineid = "FineId";
END;
$$;


-- ============================================================
-- PERSON MANAGEMENT
-- ============================================================

-- Check if national ID exists
CREATE OR REPLACE FUNCTION usp_CheckNationalIdExists(
    "NationalId" TEXT
)
RETURNS TABLE("ExistsFlag" INTEGER)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT CASE WHEN EXISTS (
        SELECT 1 FROM person p WHERE p.nationalid = "NationalId"
    ) THEN 1 ELSE 0 END AS "ExistsFlag";
END;
$$;


-- Assign person role at ranch
CREATE OR REPLACE FUNCTION usp_AssignPersonRoleAtRanch(
    "PersonId"   INTEGER,
    "RanchId"    INTEGER,
    "RoleId"     SMALLINT,
    "RoleStatus" TEXT DEFAULT 'Pending'
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    IF "RoleStatus" NOT IN ('Pending', 'Approved', 'Rejected') THEN
        RAISE EXCEPTION 'Invalid RoleStatus';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM person p WHERE p.personid = "PersonId") THEN
        RAISE EXCEPTION 'Person does not exist';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM ranch r WHERE r.ranchid = "RanchId") THEN
        RAISE EXCEPTION 'Ranch does not exist';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM role r WHERE r.roleid = "RoleId") THEN
        RAISE EXCEPTION 'Role does not exist';
    END IF;

    INSERT INTO personranch (personid, ranchid) VALUES ("PersonId", "RanchId")
    ON CONFLICT DO NOTHING;

    IF NOT EXISTS (
        SELECT 1 FROM personranchrole prr
        WHERE prr.personid = "PersonId" AND prr.ranchid = "RanchId" AND prr.roleid = "RoleId"
    ) THEN
        INSERT INTO personranchrole (personid, ranchid, roleid, rolestatus)
        VALUES ("PersonId", "RanchId", "RoleId", "RoleStatus");
    ELSE
        UPDATE personranchrole SET rolestatus = "RoleStatus"
        WHERE personid = "PersonId" AND ranchid = "RanchId" AND roleid = "RoleId";
    END IF;
END;
$$;


-- Update person role status
CREATE OR REPLACE FUNCTION usp_UpdatePersonRoleStatus(
    "PersonId"   INTEGER,
    "RanchId"    INTEGER,
    "RoleId"     SMALLINT,
    "RoleStatus" TEXT
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    IF "RoleStatus" NOT IN ('Pending', 'Approved', 'Rejected') THEN
        RAISE EXCEPTION 'Invalid RoleStatus';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM personranchrole prr
        WHERE prr.personid = "PersonId" AND prr.ranchid = "RanchId" AND prr.roleid = "RoleId"
    ) THEN
        RAISE EXCEPTION 'PersonRanchRole does not exist';
    END IF;

    UPDATE personranchrole SET rolestatus = "RoleStatus"
    WHERE personid = "PersonId" AND ranchid = "RanchId" AND roleid = "RoleId";
END;
$$;


-- Set must change password flag
CREATE OR REPLACE FUNCTION usp_SetMustChangePassword(
    "SystemUserId"       INTEGER,
    "MustChangePassword" BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE systemuser SET mustchangepassword = "MustChangePassword"
    WHERE systemuserid = "SystemUserId";
END;
$$;


-- Toggle system user active status
CREATE OR REPLACE FUNCTION usp_ToggleSystemUserStatus(
    "SystemUserId" INTEGER,
    "IsActive"     BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE systemuser SET isactive = "IsActive"
    WHERE systemuserid = "SystemUserId";
END;
$$;


-- Get all ranches and roles for a person
CREATE OR REPLACE FUNCTION usp_GetPersonRanchesAndRoles(
    "PersonId" INTEGER
)
RETURNS TABLE(
    "RanchId"    INTEGER,
    "RanchName"  TEXT,
    "RoleId"     SMALLINT,
    "RoleName"   TEXT,
    "RoleStatus" TEXT
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT prr.ranchid, r.ranchname, prr.roleid, rl.rolename, prr.rolestatus
    FROM personranchrole prr
    INNER JOIN ranch r  ON prr.ranchid = r.ranchid
    INNER JOIN role  rl ON prr.roleid  = rl.roleid
    WHERE prr.personid = "PersonId";
END;
$$;


-- Update person details
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


-- Search persons
CREATE OR REPLACE FUNCTION usp_SearchPersons(
    "SearchText" TEXT    DEFAULT NULL,
    "IsActive"   BOOLEAN DEFAULT NULL
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
    WHERE ("SearchText" IS NULL OR
           p.firstname ILIKE '%' || "SearchText" || '%' OR
           p.lastname  ILIKE '%' || "SearchText" || '%')
      AND ("IsActive" IS NULL OR su.isactive = "IsActive");
END;
$$;


-- Insert or upgrade federation member
CREATE OR REPLACE FUNCTION usp_InsertOrUpgradeFederationMember(
    "PersonId"             INTEGER     DEFAULT NULL,
    "NationalId"           TEXT        DEFAULT NULL,
    "FirstName"            TEXT        DEFAULT NULL,
    "LastName"             TEXT        DEFAULT NULL,
    "Gender"               TEXT        DEFAULT NULL,
    "DateOfBirth"          DATE        DEFAULT NULL,
    "CellPhone"            TEXT        DEFAULT NULL,
    "Email"                TEXT        DEFAULT NULL,
    "HasValidMembership"   BOOLEAN,
    "MedicalCheckValidUntil" DATE,
    "CertificationLevel"   TEXT
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


-- Get all federation members
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


-- Add managed person
CREATE OR REPLACE FUNCTION usp_AddManagedPerson(
    "SystemUserId"   INTEGER,
    "PersonId"       INTEGER,
    "ApprovalStatus" TEXT DEFAULT 'Pending'
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO personmanagedbysystemuser (systemuserid, personid, requestdate, approvalstatus)
    VALUES ("SystemUserId", "PersonId", NOW(), "ApprovalStatus");
END;
$$;


-- Get managed persons for a system user
CREATE OR REPLACE FUNCTION usp_GetManagedPersons(
    "SystemUserId" INTEGER
)
RETURNS TABLE(
    "PersonId"       INTEGER,
    "FirstName"      TEXT,
    "LastName"       TEXT,
    "NationalId"     TEXT,
    "RequestDate"    TIMESTAMP,
    "ApprovalStatus" TEXT
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT m.personid, p.firstname, p.lastname, p.nationalid, m.requestdate, m.approvalstatus
    FROM personmanagedbysystemuser m
    INNER JOIN person p ON m.personid = p.personid
    WHERE m.systemuserid = "SystemUserId";
END;
$$;


-- Insert person (legacy)
CREATE OR REPLACE FUNCTION usp_InsertPerson(
    "NationalId"  TEXT,
    "FirstName"   TEXT,
    "LastName"    TEXT,
    "Gender"      TEXT,
    "DateOfBirth" DATE,
    "CellPhone"   TEXT,
    "Email"       TEXT
)
RETURNS TABLE("NewPersonId" INTEGER)
LANGUAGE plpgsql AS $$
DECLARE
    v_new_id INTEGER;
BEGIN
    INSERT INTO person (nationalid, firstname, lastname, gender, dateofbirth, cellphone, email)
    VALUES ("NationalId", "FirstName", "LastName", "Gender", "DateOfBirth", "CellPhone", "Email")
    RETURNING personid INTO v_new_id;

    RETURN QUERY SELECT v_new_id AS "NewPersonId";
END;
$$;
