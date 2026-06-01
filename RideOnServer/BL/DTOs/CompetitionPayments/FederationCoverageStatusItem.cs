namespace RideOnServer.BL.DTOs.CompetitionPayments
{
    public class FederationCoverageStatusItem
    {
        public int CompetitionId { get; set; }

        public int PayerPersonId { get; set; }

        public string PayerFullName { get; set; } = string.Empty;

        public decimal TotalFederationAmount { get; set; }

        public decimal CoveredFederationAmount { get; set; }

        public decimal MissingFederationAmount { get; set; }

        public int TotalChargesCount { get; set; }

        public int FullyCoveredChargesCount { get; set; }

        public int PartiallyCoveredChargesCount { get; set; }

        public int UncoveredChargesCount { get; set; }

        public string CoverageStatus { get; set; } = string.Empty;
    }
}