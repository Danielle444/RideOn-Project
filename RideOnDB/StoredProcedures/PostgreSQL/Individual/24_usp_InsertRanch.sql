CREATE OR REPLACE FUNCTION usp_InsertRanch(
    p_RanchName    TEXT,
    p_ContactEmail TEXT DEFAULT NULL,
    p_ContactPhone TEXT DEFAULT NULL,
    p_WebsiteUrl   TEXT DEFAULT NULL,
    p_Location     TEXT DEFAULT NULL
)
RETURNS TABLE("NewRanchId" INTEGER)
LANGUAGE plpgsql AS $$
DECLARE
    v_new_id INTEGER;
BEGIN
    INSERT INTO ranch (ranchname, contactemail, contactphone, websiteurl, location, ranchstatus)
    VALUES (p_RanchName, p_ContactEmail, p_ContactPhone, p_WebsiteUrl, p_Location, 'Pending')
    RETURNING ranchid INTO v_new_id;

    RETURN QUERY SELECT v_new_id AS "NewRanchId";
END;
$$;
