CREATE OR REPLACE FUNCTION usp_InsertArena(
    p_RanchId     INTEGER,
    p_ArenaName   TEXT,
    p_ArenaLength SMALLINT DEFAULT NULL,
    p_ArenaWidth  SMALLINT DEFAULT NULL,
    p_IsCovered   BOOLEAN  DEFAULT NULL
)
RETURNS TABLE("NewArenaId" SMALLINT)
LANGUAGE plpgsql AS $$
DECLARE
    v_new_arena_id SMALLINT;
BEGIN
    SELECT COALESCE(MAX(a.arenaid), 0) + 1 INTO v_new_arena_id
    FROM arena a WHERE a.ranchid = p_RanchId;

    INSERT INTO arena (ranchid, arenaid, arenaname, arenalength, arenawidth, iscovered)
    VALUES (p_RanchId, v_new_arena_id, p_ArenaName, p_ArenaLength, p_ArenaWidth, p_IsCovered);

    RETURN QUERY SELECT v_new_arena_id AS "NewArenaId";
END;
$$;
