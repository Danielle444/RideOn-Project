CREATE OR REPLACE FUNCTION usp_GetRanchById(
    p_RanchId INTEGER
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
    WHERE r.ranchid = p_RanchId;
END;
$$;
