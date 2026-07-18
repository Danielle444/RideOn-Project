namespace RideOnServer.BL.DTOs.Prediction
{
    // One row from usp_GetEntryPredictionFeatureInputs. FieldAvgPastEntries and
    // ClassNameAvgPastEntries are nullable on purpose — the proc never coalesces them, so the
    // fallback/refusal rules stay in FeatureVectorBuilder where they can be unit tested without
    // a DB connection.
    public sealed class EntryPredictionFeatureInputs
    {
        public int ClassInCompId { get; init; }
        public int CompetitionId { get; init; }
        public DateTime ClassDateTime { get; init; }
        public short? OrderInDay { get; init; }
        public decimal TotalCost { get; init; }
        public short ClassTypeId { get; init; }
        public string ClassName { get; init; } = string.Empty;
        public short FieldId { get; init; }
        public string FieldName { get; init; } = string.Empty;
        public int ClassesPerCompetition { get; init; }
        public decimal? FieldAvgPastEntries { get; init; }
        public decimal? ClassNameAvgPastEntries { get; init; }
        public decimal PrizeShovarAmount { get; init; }
        public decimal PrizeJackpotPostedAmount { get; init; }
        public decimal PrizeAddedMoneyAmount { get; init; }
    }
}
