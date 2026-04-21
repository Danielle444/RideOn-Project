CREATE OR REPLACE FUNCTION usp_GetHorsesForCompetition(
    p_CompetitionId INTEGER
)
RETURNS TABLE(
    "HorseId"   INTEGER,
    "HorseName" VARCHAR,
    "BarnName"  VARCHAR
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT h.horseid, h.horsename, h.barnname
    FROM public.horseparticipationincompetition hpc
    JOIN public.horse h ON h.horseid = hpc.horseid
    WHERE hpc.competitionid = p_CompetitionId
    ORDER BY h.horsename;
END;
$$;
