CREATE OR REPLACE FUNCTION usp_GetClassesByCompetitionId(
    "CompetitionId" INTEGER
)
RETURNS TABLE(
    "ClassInCompId"  INTEGER,
    "ClassTypeId"    SMALLINT,
    "ClassName"      TEXT,
    "ArenaRanchId"   INTEGER,
    "ArenaId"        SMALLINT,
    "ArenaName"      TEXT,
    "ClassDateTime"  TIMESTAMP,
    "OrganizerCost"  NUMERIC(10,2),
    "FederationCost" NUMERIC(10,2),
    "StartTime"      TIME,
    "OrderInDay"     SMALLINT,
    "ClassNotes"     TEXT
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT
        cic.classincompid,
        cic.classtypeid,
        ct.classname,
        cic.arenaranchid,
        cic.arenaid,
        a.arenaname,
        cic.classdatetime,
        cic.organizercost,
        cic.federationcost,
        cic.starttime,
        cic.orderinday,
        cic.classnotes
    FROM classincompetition cic
    INNER JOIN classtype ct ON cic.classtypeid  = ct.classtypeid
    INNER JOIN arena     a  ON cic.arenaranchid = a.ranchid AND cic.arenaid = a.arenaid
    WHERE cic.competitionid = "CompetitionId"
    ORDER BY cic.classdatetime ASC, cic.orderinday ASC, cic.classincompid ASC;
END;
$$;
