namespace RideOnServer.BL.DTOs.CompetitionPayments
{
    public class FederationMatchingSuggestionItem
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

        public int PaidByPersonId { get; set; }

        public string PayerFullName { get; set; } = string.Empty;

        public decimal TotalFederationAmount { get; set; }

        public decimal CoveredFederationAmount { get; set; }

        public decimal MissingFederationAmount { get; set; }

        public decimal SuggestedAllocatedAmount { get; set; }

        public int MatchScore { get; set; }

        public string ConfidenceLevel { get; set; } = string.Empty;

        public string MatchReason { get; set; } = string.Empty;
    }
}