CREATE OR REPLACE FUNCTION usp_InsertClassInCompetition(
    p_CompetitionId  INTEGER,
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
RETURNS TABLE("NewClassInCompId" INTEGER)
LANGUAGE plpgsql AS $$
DECLARE
    v_new_id INTEGER;
BEGIN
    INSERT INTO classincompetition (
        competitionid, classtypeid, arenaranchid, arenaid,
        classdatetime, starttime, orderinday,
        organizercost, federationcost, classnotes
    )
    VALUES (
        p_CompetitionId, p_ClassTypeId, p_ArenaRanchId, p_ArenaId,
        p_ClassDateTime, p_StartTime, p_OrderInDay,
        p_OrganizerCost, p_FederationCost, p_ClassNotes
    )
    RETURNING classincompid INTO v_new_id;

    RETURN QUERY SELECT v_new_id AS "NewClassInCompId";
END;
$$;
