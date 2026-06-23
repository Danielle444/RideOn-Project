namespace RideOnServer.BL.DTOs.CompetitionPayments
{
    public class AllocateFederationCreditRequest
    {
        public int CompetitionId { get; set; }

        public int RanchId { get; set; }

        public int FederationExternalCreditId { get; set; }

        public int BillChargeId { get; set; }

        public decimal AllocatedAmount { get; set; }

        public int AllocatedBySystemUserId { get; set; }

        public string? Notes { get; set; }
    }
}