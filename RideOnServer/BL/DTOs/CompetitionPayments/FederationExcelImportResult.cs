namespace RideOnServer.BL.DTOs.CompetitionPayments
{
    public class FederationExcelImportResult
    {
        public int TotalRows { get; set; }

        public int ImportedCreditsCount { get; set; }

        public int SkippedDuplicatesCount { get; set; }

        public int SkippedZeroAmountCount { get; set; }

        public int FailedRowsCount { get; set; }

        public List<string> Errors { get; set; } = new List<string>();

        public string Message { get; set; } = string.Empty;
    }
}