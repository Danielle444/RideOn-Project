CREATE OR REPLACE FUNCTION usp_GetClassesFromLatestCompetition(
    p_FieldId SMALLINT
)
RETURNS TABLE(
    "ClassInCompId"         INTEGER,
    "ClassTypeId"           SMALLINT,
    "ClassName"             TEXT,
    "CompetitionId"         INTEGER,
    "CompetitionName"       TEXT,
    "CompetitionStartDate"  DATE,
    "OrganizerCost"         NUMERIC(10,2),
    "FederationCost"        NUMERIC(10,2)
)
LANGUAGE plpgsql AS $$
DECLARE
    v_latest_comp_id INTEGER;
BEGIN
    SELECT c.competitionid INTO v_latest_comp_id
    FROM competition c
    WHERE c.fieldid = p_FieldId
    ORDER BY c.competitionstartdate DESC
    LIMIT 1;

    IF v_latest_comp_id IS NOT NULL THEN
        RETURN QUERY
        SELECT
            cic.classincompid,
            cic.classtypeid,
            ct.classname,
            c.competitionid,
            c.competitionname,
            c.competitionstartdate,
            cic.organizercost,
            cic.federationcost
        FROM classincompetition cic
        INNER JOIN competition c  ON cic.competitionid = c.competitionid
        INNER JOIN classtype   ct ON cic.classtypeid   = ct.classtypeid
        WHERE cic.competitionid = v_latest_comp_id
        ORDER BY cic.orderinday ASC;
    END IF;
END;
$$;
