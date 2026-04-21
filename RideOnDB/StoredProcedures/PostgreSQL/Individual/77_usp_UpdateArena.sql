CREATE OR REPLACE FUNCTION usp_UpdateArena(
    p_RanchId     INTEGER,
    p_ArenaId     SMALLINT,
    p_ArenaName   TEXT,
    p_ArenaLength SMALLINT DEFAULT NULL,
    p_ArenaWidth  SMALLINT DEFAULT NULL,
    p_IsCovered   BOOLEAN  DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE arena SET
        arenaname   = p_ArenaName,
        arenalength = p_ArenaLength,
        arenawidth  = p_ArenaWidth,
        iscovered   = p_IsCovered
    WHERE ranchid = p_RanchId AND arenaid = p_ArenaId;
END;
$$;
