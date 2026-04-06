CREATE OR REPLACE FUNCTION usp_GetAllRanchesByUserId(
    p_UserId INTEGER
)
RETURNS TABLE(
    "RanchId"      INTEGER,
    "RanchName"    TEXT,
    "ContactEmail" TEXT,
    "ContactPhone" TEXT,
    "WebsiteUrl"   TEXT,
    "Location"     TEXT
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
        r.location
    FROM ranch r
    INNER JOIN personranch pr ON r.ranchid = pr.ranchid
    WHERE pr.personid   = p_UserId
      AND r.ranchstatus = 'Approved';
END;
$$;
