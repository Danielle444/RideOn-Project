CREATE OR REPLACE FUNCTION usp_UpdateRanch(
    p_RanchId      INTEGER,
    p_RanchName    TEXT,
    p_ContactEmail TEXT DEFAULT NULL,
    p_ContactPhone TEXT DEFAULT NULL,
    p_WebsiteUrl   TEXT DEFAULT NULL,
    p_Location     TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE ranch SET
        ranchname    = p_RanchName,
        contactemail = p_ContactEmail,
        contactphone = p_ContactPhone,
        websiteurl   = p_WebsiteUrl,
        location     = p_Location
    WHERE ranchid = p_RanchId;
END;
$$;
