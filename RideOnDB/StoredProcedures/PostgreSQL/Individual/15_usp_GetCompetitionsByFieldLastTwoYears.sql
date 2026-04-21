CREATE OR REPLACE FUNCTION usp_GetCompetitionsByFieldLastTwoYears(
    p_FieldId SMALLINT
)
RETURNS TABLE("CompetitionId" INTEGER, "CompetitionName" TEXT)
LANGUAGE plpgsql AS $$
DECLARE
    v_two_years_ago DATE := CURRENT_DATE - INTERVAL '2 years';
BEGIN
    RETURN QUERY
    SELECT c.competitionid, c.competitionname
    FROM competition c
    WHERE c.fieldid = p_FieldId
      AND c.competitionstartdate >= v_two_years_ago
    ORDER BY c.competitionstartdate DESC;
END;
$$;
