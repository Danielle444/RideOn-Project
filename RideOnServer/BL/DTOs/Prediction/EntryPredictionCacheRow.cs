namespace RideOnServer.BL.DTOs.Prediction
{
    // One row from usp_GetEntryPredictionsByCompetitionId -- the cached prediction plus the
    // rmse of the modelversion it was computed with (not necessarily the currently active model).
    public sealed class EntryPredictionCacheRow
    {
        public int ClassInCompId { get; init; }
        public decimal PredictedEntries { get; init; }
        public int ModelVersionId { get; init; }
        public DateTime ComputedAt { get; init; }
        public double Rmse { get; init; }
    }
}
