-- Upserts the entry-prediction cache row for one classincompid. Matches the live deployed
-- definition exactly (pg_get_functiondef, verified by claude.ai before deploy: no prior function
-- with this name existed, entryprediction_pkey on classincompid backs the ON CONFLICT target,
-- both insert and update paths smoke tested). Called from PredictionService (C#) once per class
-- during a competition recompute -- see RideOnServer/BL/PredictionService.cs.
CREATE OR REPLACE FUNCTION public.usp_upsertentryprediction(p_classincompid integer, p_predictedentries numeric, p_modelversionid integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    INSERT INTO entryprediction (classincompid, predictedentries, modelversionid, computedat)
    VALUES (p_classincompid, p_predictedentries, p_modelversionid, now())
    ON CONFLICT (classincompid)
    DO UPDATE SET
        predictedentries = EXCLUDED.predictedentries,
        modelversionid   = EXCLUDED.modelversionid,
        computedat       = now();
END;
$function$
