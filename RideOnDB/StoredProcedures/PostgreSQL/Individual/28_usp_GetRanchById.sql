CREATE OR REPLACE FUNCTION usp_GetRanchById(
    p_RanchId INTEGER
)
RETURNS TABLE(
    "RanchId"      INTEGER,
    "RanchName"    TEXT,
    "ContactEmail" TEXT,
    "ContactPhone" TEXT,
    "WebsiteUrl"   TEXT,
    "Location"     TEXT,
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
        r.location,
        r.latitude,
        r.longitude
    FROM ranch r
    WHERE r.ranchid = p_RanchId;
END;
$$;
