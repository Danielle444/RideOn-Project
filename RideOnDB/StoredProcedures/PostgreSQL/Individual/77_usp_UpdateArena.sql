CREATE OR REPLACE FUNCTION usp_UpdateArena(
    "RanchId"     INTEGER,
    "ArenaId"     SMALLINT,
    "ArenaName"   TEXT,
    "ArenaLength" SMALLINT DEFAULT NULL,
    "ArenaWidth"  SMALLINT DEFAULT NULL,
    "IsCovered"   BOOLEAN  DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE arena SET
        arenaname   = "ArenaName",
        arenalength = "ArenaLength",
        arenawidth  = "ArenaWidth",
        iscovered   = "IsCovered"
    WHERE ranchid = "RanchId" AND arenaid = "ArenaId";
END;
$$;
