CREATE OR REPLACE FUNCTION usp_GetStallsByCompoundId(
    "RanchId"    INTEGER,
    "CompoundId" SMALLINT
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
    WHERE s.ranchid    = "RanchId"
      AND s.compoundid = "CompoundId";
END;
$$;
