namespace RideOnServer.BL.DTOs.Prediction
{
    // Read-side response for one class's cached prediction. MinPredictedEntries/MaxPredictedEntries
    // are computed here at read time (predicted +/- rmse, clamped at 0) and never stored -- mirrors
    // PredictionService.ComputePrediction's clamp-at-0 convention for the point estimate.
    public sealed class ClassEntryPrediction
    {
        public int ClassInCompId { get; init; }
        public decimal PredictedEntries { get; init; }
        public decimal MinPredictedEntries { get; init; }
        public decimal MaxPredictedEntries { get; init; }
        public int ModelVersionId { get; init; }
        public DateTime ComputedAt { get; init; }
    }
}
