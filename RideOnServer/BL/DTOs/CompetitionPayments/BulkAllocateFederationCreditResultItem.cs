namespace RideOnServer.BL.DTOs.CompetitionPayments
{
    public class BulkAllocateFederationCreditResultItem
    {
        public int BillChargeId { get; set; }

        public decimal AllocatedAmount { get; set; }

        public string BillChargeStatus { get; set; } = string.Empty;

        public decimal CreditAvailableAmount { get; set; }

        public string CreditStatus { get; set; } = string.Empty;
    }
}
