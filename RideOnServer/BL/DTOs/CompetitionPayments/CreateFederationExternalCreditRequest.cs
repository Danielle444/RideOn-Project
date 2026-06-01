namespace RideOnServer.BL.DTOs.CompetitionPayments
{
    public class CreateFederationExternalCreditRequest
    {
        public int CompetitionId { get; set; }

        public int RanchId { get; set; }

        public string SourceType { get; set; } = string.Empty;

        public string? ExternalReference { get; set; }

        public string? ExternalName { get; set; }

        public string? ExternalClubName { get; set; }

        public string? ExternalIdNumber { get; set; }

        public decimal OriginalAmount { get; set; }

        public int CreatedBySystemUserId { get; set; }

        public string? Notes { get; set; }
    }
}