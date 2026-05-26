namespace RideOnServer.BL.DTOs.Competition.Entry
{
    public class BulkDuplicateEntriesRequest
    {
        public int SourceCompetitionId { get; set; }

        public int TargetCompetitionId { get; set; }

        public int OrderedBySystemUserId { get; set; }

        public int RanchId { get; set; }

        public List<BulkDuplicateEntryItem> Entries { get; set; } =
            new List<BulkDuplicateEntryItem>();
    }

    public class BulkDuplicateEntryItem
    {
        public int SourceEntryId { get; set; }

        public int TargetClassInCompId { get; set; }
    }

    public class BulkDuplicateEntriesResponse
    {
        public int SuccessCount { get; set; }

        public int FailureCount { get; set; }

        public List<BulkDuplicateEntryResult> Results { get; set; } =
            new List<BulkDuplicateEntryResult>();
    }

    public class BulkDuplicateEntryResult
    {
        public int SourceEntryId { get; set; }

        public int? NewEntryId { get; set; }

        public bool Success { get; set; }

        public string? ErrorMessage { get; set; }
    }
}
