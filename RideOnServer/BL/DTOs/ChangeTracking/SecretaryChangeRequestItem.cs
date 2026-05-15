namespace RideOnServer.BL.DTOs.ChangeTracking
{
    public class SecretaryChangeRequestItem
    {
        public int RequestId { get; set; }

        public string RequestSource { get; set; } = string.Empty;

        public string RequestType { get; set; } = string.Empty;

        public int CompetitionId { get; set; }

        public string CompetitionName { get; set; } = string.Empty;

        public DateTime RequestDate { get; set; }

        public int RequestedByPersonId { get; set; }

        public string RequestedByName { get; set; } = string.Empty;

        public string EntityType { get; set; } = string.Empty;

        public string EntityName { get; set; } = string.Empty;

        public string BeforeText { get; set; } = string.Empty;

        public string AfterText { get; set; } = string.Empty;

        public string Status { get; set; } = string.Empty;

        public bool IsCancelled { get; set; }

        public int OriginalEntityId { get; set; }

        public int? NewEntityId { get; set; }

        public int? FineId { get; set; }

        public decimal? FineAmountSnapshot { get; set; }

        public decimal AmountBefore { get; set; }

        public decimal AmountAfter { get; set; }
    }
}