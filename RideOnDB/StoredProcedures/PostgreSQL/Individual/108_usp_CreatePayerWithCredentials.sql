-- יצירת משלם חדש על ידי אדמין — ללא סיסמה אמיתית
-- המשלם יקבל קישור לסיום הרשמה ויבחר סיסמה בעצמו
-- rolestatus = 'Pending' עד אישור SuperUser
CREATE OR REPLACE FUNCTION usp_CreatePayerWithCredentials(
    p_FirstName     TEXT,
    p_LastName      TEXT,
    p_Email         TEXT,
    p_CellPhone     TEXT        DEFAULT NULL,
    p_Username      TEXT        DEFAULT NULL,
    p_PasswordHash  TEXT        DEFAULT NULL,
    p_PasswordSalt  TEXT        DEFAULT NULL,
    p_RanchId       INTEGER     DEFAULT NULL,
    p_RoleId        SMALLINT    DEFAULT NULL
)
RETURNS TABLE("NewPersonId" INTEGER, "Username" TEXT)
LANGUAGE plpgsql AS $$
DECLARE
    v_person_id  INTEGER;
    v_username   TEXT;
BEGIN
    IF p_Username IS NOT NULL AND EXISTS (
        SELECT 1 FROM systemuser su WHERE su.username = p_Username
    ) THEN
        RAISE EXCEPTION 'Username already exists: %', p_Username;
    END IF;

    IF p_Email IS NOT NULL AND EXISTS (
        SELECT 1 FROM person pe
        INNER JOIN systemuser su ON su.systemuserid = pe.personid
        WHERE pe.email = p_Email
    ) THEN
        RAISE EXCEPTION 'A system user with this email already exists';
    END IF;

    v_username := p_Username;

    SELECT p.personid INTO v_person_id
    FROM person p
    WHERE (p_Email IS NOT NULL AND p.email = p_Email)
       OR (p_CellPhone IS NOT NULL AND p.cellphone = p_CellPhone)
    LIMIT 1;

    IF v_person_id IS NOT NULL THEN
        IF EXISTS (SELECT 1 FROM systemuser su WHERE su.systemuserid = v_person_id) THEN
            RAISE EXCEPTION 'This person already has a system user account';
        END IF;

        UPDATE person SET
            firstname = CASE WHEN (firstname IS NULL OR TRIM(firstname) = '') THEN p_FirstName ELSE firstname END,
            lastname  = CASE WHEN (lastname  IS NULL OR TRIM(lastname)  = '') THEN p_LastName  ELSE lastname  END,
            email     = CASE WHEN (email     IS NULL OR TRIM(email)     = '') THEN p_Email     ELSE email     END,
            cellphone = CASE WHEN (cellphone IS NULL OR TRIM(cellphone) = '') THEN p_CellPhone ELSE cellphone END
        WHERE personid = v_person_id;
    ELSE
        INSERT INTO person (firstname, lastname, email, cellphone)
        VALUES (p_FirstName, p_LastName, p_Email, p_CellPhone)
        RETURNING personid INTO v_person_id;
    END IF;

    -- isactive = FALSE עד שהמשלם ישלים הרשמה ו-SuperUser יאשר
    -- registrationcompleted = FALSE עד שהמשלם ימלא פרטים דרך הקישור
    INSERT INTO systemuser (
        systemuserid, username, passwordhash, passwordsalt,
        mustchangepassword, isactive, registrationcompleted
    )
    VALUES (
        v_person_id, v_username, p_PasswordHash, p_PasswordSalt,
        TRUE, FALSE, FALSE
    );

    IF p_RanchId IS NOT NULL AND p_RoleId IS NOT NULL THEN
        INSERT INTO personranch (personid, ranchid)
        VALUES (v_person_id, p_RanchId)
        ON CONFLICT DO NOTHING;

        -- Pending עד אישור SuperUser
        INSERT INTO personranchrole (personid, ranchid, roleid, rolestatus)
        VALUES (v_person_id, p_RanchId, p_RoleId, 'Pending')
        ON CONFLICT (personid, ranchid, roleid) DO UPDATE SET rolestatus = 'Pending';
    END IF;

    RETURN QUERY SELECT v_person_id AS "NewPersonId", v_username AS "Username";
END;
$$;
