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
