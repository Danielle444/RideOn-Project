namespace RideOnServer.BL.DTOs.Prediction
{
    // Output of FeatureVectorBuilder.Build — the 44 raw (unscaled) feature values in the exact
    // order modelparameter.featureorder dictates, plus everything a caller needs to apply the
    // runtime formula later: prediction = intercept + sum(coefficient * (value - scalermean) /
    // scalerscale), clamped at 0. Building the scaled prediction itself is out of scope for this
    // task — this type only carries what a future predictor/parity check needs.
    public sealed record PredictionFeatureVector(
        int ClassInCompId,
        int ModelVersionId,
        double Intercept,
        double Rmse,
        IReadOnlyList<string> FeatureNames,
        IReadOnlyList<double> Values,
        IReadOnlyList<ModelParameterRow> Parameters);
}
