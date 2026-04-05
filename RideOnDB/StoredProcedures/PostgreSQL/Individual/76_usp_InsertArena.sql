CREATE OR REPLACE FUNCTION usp_InsertArena(
    "RanchId"     INTEGER,
    "ArenaName"   TEXT,
    "ArenaLength" SMALLINT DEFAULT NULL,
    "ArenaWidth"  SMALLINT DEFAULT NULL,
    "IsCovered"   BOOLEAN  DEFAULT NULL
)
RETURNS TABLE("NewArenaId" SMALLINT)
LANGUAGE plpgsql AS $$
DECLARE
    v_new_arena_id SMALLINT;
BEGIN
    SELECT COALESCE(MAX(a.arenaid), 0) + 1 INTO v_new_arena_id
    FROM arena a WHERE a.ranchid = "RanchId";

    INSERT INTO arena (ranchid, arenaid, arenaname, arenalength, arenawidth, iscovered)
    VALUES ("RanchId", v_new_arena_id, "ArenaName", "ArenaLength", "ArenaWidth", "IsCovered");

    RETURN QUERY SELECT v_new_arena_id AS "NewArenaId";
END;
$$;
