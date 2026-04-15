CREATE OR REPLACE FUNCTION usp_UnassignHorseFromStall(
    p_CompetitionId INTEGER,
    p_RanchId       INTEGER,
    p_CompoundId    SMALLINT,
    p_StallId       SMALLINT
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    DELETE FROM public.stallassignment
    WHERE competitionid = p_CompetitionId
      AND ranchid       = p_RanchId
      AND compoundid    = p_CompoundId
      AND stallid       = p_StallId;
END;
$$;
