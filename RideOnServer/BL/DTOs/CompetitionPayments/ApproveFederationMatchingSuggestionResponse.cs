namespace RideOnServer.BL.DTOs.CompetitionPayments
{
    public class ApproveFederationMatchingSuggestionResponse
    {
        public decimal ApprovedAmount { get; set; }

        public int AllocationsCount { get; set; }

        public decimal RemainingCreditAmount { get; set; }

        public string Message { get; set; } = string.Empty;
    }
}