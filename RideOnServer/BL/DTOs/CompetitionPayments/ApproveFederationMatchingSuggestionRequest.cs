namespace RideOnServer.BL.DTOs.CompetitionPayments
{
    public class ApproveFederationMatchingSuggestionRequest
    {
        public int CompetitionId { get; set; }

        public int RanchId { get; set; }

        public int FederationExternalCreditId { get; set; }

        public int PaidByPersonId { get; set; }

        public decimal Amount { get; set; }

        public string? Notes { get; set; }
    }
}