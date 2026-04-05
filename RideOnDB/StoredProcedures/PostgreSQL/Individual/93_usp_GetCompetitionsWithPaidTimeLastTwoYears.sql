CREATE OR REPLACE FUNCTION usp_GetCompetitionsWithPaidTimeLastTwoYears()
RETURNS TABLE(
    "CompetitionId"         INTEGER,
    "CompetitionName"       TEXT,
    "CompetitionStartDate"  DATE
)
LANGUAGE plpgsql AS $$
DECLARE
    v_two_years_ago DATE := CURRENT_DATE - INTERVAL '2 years';
BEGIN
    RETURN QUERY
    SELECT c.competitionid, c.competitionname, c.competitionstartdate
    FROM competition c
    WHERE c.competitionstartdate >= v_two_years_ago
      AND EXISTS (
          SELECT 1 FROM paidtimeslotincompetition ptc
          WHERE ptc.competitionid = c.competitionid
      )
    ORDER BY c.competitionstartdate DESC;
END;
$$;
