CREATE OR REPLACE FUNCTION usp_InsertClassInCompetition(
    "CompetitionId"  INTEGER,
    "ClassTypeId"    SMALLINT,
    "ArenaRanchId"   INTEGER,
    "ArenaId"        SMALLINT,
    "ClassDateTime"  TIMESTAMP  DEFAULT NULL,
    "StartTime"      TIME       DEFAULT NULL,
    "OrderInDay"     SMALLINT   DEFAULT NULL,
    "OrganizerCost"  NUMERIC(10,2) DEFAULT NULL,
    "FederationCost" NUMERIC(10,2) DEFAULT NULL,
    "ClassNotes"     TEXT       DEFAULT NULL
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
        "CompetitionId", "ClassTypeId", "ArenaRanchId", "ArenaId",
        "ClassDateTime", "StartTime", "OrderInDay",
        "OrganizerCost", "FederationCost", "ClassNotes"
    )
    RETURNING classincompid INTO v_new_id;

    RETURN QUERY SELECT v_new_id AS "NewClassInCompId";
END;
$$;
