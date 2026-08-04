namespace RideOnServer.BL.DTOs.CompetitionPayments
{
    public class BulkAllocateFederationCreditRequest
    {
        public int CompetitionId { get; set; }

        public int RanchId { get; set; }

        public int FederationExternalCreditId { get; set; }

        public List<int> BillChargeIds { get; set; } = new List<int>();

        public string? Notes { get; set; }
    }
}
