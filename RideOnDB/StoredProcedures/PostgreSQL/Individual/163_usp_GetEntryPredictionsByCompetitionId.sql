CREATE OR REPLACE FUNCTION usp_GetEntryPredictionsByCompetitionId(p_competitionid integer)
RETURNS TABLE (
    classincompid integer,
    predictedentries numeric,
    modelversionid integer,
    computedat timestamptz,
    rmse numeric
)
LANGUAGE sql
AS $$
    SELECT
        ep.classincompid,
        ep.predictedentries,
        ep.modelversionid,
        ep.computedat,
        mv.rmse
    FROM entryprediction ep
    JOIN classincompetition cic ON cic.classincompid = ep.classincompid
    JOIN modelversion mv ON mv.modelversionid = ep.modelversionid
    WHERE cic.competitionid = p_competitionid
    ORDER BY cic.classdatetime ASC NULLS LAST,
             cic.orderinday ASC NULLS LAST,
             cic.starttime ASC NULLS LAST,
             ep.classincompid ASC;
$$;
