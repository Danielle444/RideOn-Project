CREATE OR REPLACE FUNCTION usp_GetArenasByRanchId(
    p_RanchId INTEGER
)
RETURNS TABLE(
    "ArenaId"     SMALLINT,
    "ArenaName"   TEXT,
    "ArenaLength" SMALLINT,
    "ArenaWidth"  SMALLINT,
    "IsCovered"   BOOLEAN
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT a.arenaid, a.arenaname, a.arenalength, a.arenawidth, a.iscovered
    FROM arena a
    WHERE a.ranchid = p_RanchId
    ORDER BY a.arenaname;
END;
$$;
