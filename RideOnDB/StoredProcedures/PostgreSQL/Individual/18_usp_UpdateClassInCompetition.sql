CREATE OR REPLACE FUNCTION usp_UpdateClassInCompetition(
    p_ClassInCompId  INTEGER,
    p_ClassTypeId    SMALLINT,
    p_ArenaRanchId   INTEGER,
    p_ArenaId        SMALLINT,
    p_ClassDateTime  TIMESTAMPTZ DEFAULT NULL,
    p_StartTime      TIME       DEFAULT NULL,
    p_OrderInDay     SMALLINT   DEFAULT NULL,
    p_OrganizerCost  NUMERIC(10,2) DEFAULT NULL,
    p_FederationCost NUMERIC(10,2) DEFAULT NULL,
    p_ClassNotes     TEXT       DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE classincompetition SET
        classtypeid    = p_ClassTypeId,
        arenaranchid   = p_ArenaRanchId,
        arenaid        = p_ArenaId,
        classdatetime  = p_ClassDateTime,
        starttime      = p_StartTime,
        orderinday     = p_OrderInDay,
        organizercost  = p_OrganizerCost,
        federationcost = p_FederationCost,
        classnotes     = p_ClassNotes
    WHERE classincompid = p_ClassInCompId;
END;
$$;
