CREATE OR REPLACE FUNCTION usp_UpdateClassInCompetition(
    "ClassInCompId"  INTEGER,
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
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE classincompetition SET
        classtypeid    = "ClassTypeId",
        arenaranchid   = "ArenaRanchId",
        arenaid        = "ArenaId",
        classdatetime  = "ClassDateTime",
        starttime      = "StartTime",
        orderinday     = "OrderInDay",
        organizercost  = "OrganizerCost",
        federationcost = "FederationCost",
        classnotes     = "ClassNotes"
    WHERE classincompid = "ClassInCompId";
END;
$$;
