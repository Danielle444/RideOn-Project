CREATE OR REPLACE FUNCTION usp_GetStallAssignmentsForCompetition(
    p_CompetitionId INTEGER
)
RETURNS TABLE(
    "CompoundId"  SMALLINT,
    "StallId"     SMALLINT,
    "StallNumber" VARCHAR,
    "HorseId"     INTEGER,
    "HorseName"   VARCHAR,
    "BarnName"    VARCHAR
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT sa.compoundid, sa.stallid, s.stallname,
           sa.horseid, h.horsename, h.barnname
    FROM public.stallassignment sa
    JOIN public.horse h ON h.horseid = sa.horseid
    JOIN public.stall s
        ON s.ranchid    = sa.ranchid
        AND s.compoundid = sa.compoundid
        AND s.stallid    = sa.stallid
    WHERE sa.competitionid = p_CompetitionId;
END;
$$;
