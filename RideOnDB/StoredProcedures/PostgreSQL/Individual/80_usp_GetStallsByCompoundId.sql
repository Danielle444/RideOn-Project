CREATE OR REPLACE FUNCTION usp_GetStallsByCompoundId(
    p_RanchId    INTEGER,
    p_CompoundId SMALLINT
)
RETURNS TABLE(
    "StallId"     SMALLINT,
    "StallNumber" TEXT,
    "StallType"   SMALLINT,
    "StallNotes"  TEXT
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT s.stallid, s.stallnumber, s.stalltype, s.stallnotes
    FROM stall s
    WHERE s.ranchid    = p_RanchId
      AND s.compoundid = p_CompoundId;
END;
$$;
