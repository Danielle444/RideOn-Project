namespace RideOnServer.BL.DTOs.CompetitionPayments
{
    public class FederationExternalCreditItem
    {
        public int FederationExternalCreditId { get; set; }

        public int CompetitionId { get; set; }

        public string SourceType { get; set; } = string.Empty;

        public string? ExternalReference { get; set; }

        public string? ExternalName { get; set; }

        public string? ExternalClubName { get; set; }

        public string? ExternalIdNumber { get; set; }

        public decimal OriginalAmount { get; set; }

        public decimal UsedAmount { get; set; }

        public decimal AvailableAmount { get; set; }

        public string CreditStatus { get; set; } = string.Empty;

        public string? UsageStatusLabel { get; set; }

        public DateTime CreatedAt { get; set; }

        public string? Notes { get; set; }
    }
}