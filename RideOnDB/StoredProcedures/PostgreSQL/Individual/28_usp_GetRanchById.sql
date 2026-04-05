CREATE OR REPLACE FUNCTION usp_GetRanchById(
    RanchId INTEGER
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
    WHERE r.ranchid = RanchId;
END;
$$;
