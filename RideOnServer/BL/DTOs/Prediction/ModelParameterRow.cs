namespace RideOnServer.BL.DTOs.Prediction
{
    // One row from usp_GetActiveModelParameters — mirrors a single (feature, coefficient,
    // scaler mean/scale) tuple from models/entry_prediction_model_v1.json, sourced from the
    // modelparameter table instead of the JSON so the DB is the single source of truth at runtime.
    public sealed class ModelParameterRow
    {
        public string FeatureName { get; init; } = string.Empty;
        public int FeatureOrder { get; init; }
        public double Coefficient { get; init; }
        public double ScalerMean { get; init; }
        public double ScalerScale { get; init; }
    }
}
