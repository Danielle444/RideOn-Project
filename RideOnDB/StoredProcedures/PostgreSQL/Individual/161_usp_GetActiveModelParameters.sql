-- Returns the 44 modelparameter rows for the currently active modelversion, ordered by
-- featureorder, with the model-level intercept and rmse riding along on every row (cheap
-- denormalization — callers need intercept once and rmse for a future +/- band, and this way
-- FeatureVectorBuilder can read both off the first row of a single result set with no second
-- round trip). isactive has a partial unique index enforcing exactly one active version, so no
-- tie-break logic is needed here.
CREATE OR REPLACE FUNCTION usp_GetActiveModelParameters()
RETURNS TABLE (
    ModelVersionId integer,
    Intercept      numeric,
    Rmse           numeric,
    FeatureName    text,
    FeatureOrder   integer,
    Coefficient    numeric,
    ScalerMean     numeric,
    ScalerScale    numeric
)
LANGUAGE sql
AS $$
    SELECT
        mv.modelversionid,
        mv.intercept,
        mv.rmse,
        mp.featurename::text AS featurename,
        mp.featureorder,
        mp.coefficient,
        mp.scalermean,
        mp.scalerscale
    FROM modelversion mv
    JOIN modelparameter mp ON mp.modelversionid = mv.modelversionid
    WHERE mv.isactive = true
    ORDER BY mp.featureorder;
$$;
