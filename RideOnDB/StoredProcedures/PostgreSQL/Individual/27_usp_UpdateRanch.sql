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
