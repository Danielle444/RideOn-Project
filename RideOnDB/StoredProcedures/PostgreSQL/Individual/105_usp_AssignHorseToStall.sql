CREATE OR REPLACE FUNCTION usp_AssignHorseToStall(
    p_CompetitionId INTEGER,
    p_RanchId       INTEGER,
    p_CompoundId    SMALLINT,
    p_StallId       SMALLINT,
    p_HorseId       INTEGER
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    -- Remove any existing assignment for this horse in this competition
    DELETE FROM public.stallassignment
    WHERE competitionid = p_CompetitionId AND horseid = p_HorseId;

    -- Insert new assignment
    INSERT INTO public.stallassignment (competitionid, ranchid, compoundid, stallid, horseid)
    VALUES (p_CompetitionId, p_RanchId, p_CompoundId, p_StallId, p_HorseId);
END;
$$;
