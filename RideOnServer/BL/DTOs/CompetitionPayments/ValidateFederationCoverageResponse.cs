namespace RideOnServer.BL.DTOs.CompetitionPayments
{
    public class ValidateFederationCoverageResponse
    {
        public bool CanProceed { get; set; }

        public int CompetitionId { get; set; }

        public int PayerPersonId { get; set; }

        public string PayerFullName { get; set; } = string.Empty;

        public decimal TotalFederationAmount { get; set; }

        public decimal CoveredFederationAmount { get; set; }

        public decimal MissingFederationAmount { get; set; }

        public string Message { get; set; } = string.Empty;
    }
}