namespace RideOnServer.BL.DTOs.CompetitionPayments
{
    public class AllocateFederationCreditResponse
    {
        public int FederationCreditAllocationId { get; set; }

        public int FederationExternalCreditId { get; set; }

        public int BillChargeId { get; set; }

        public int? EntryId { get; set; }

        public decimal AllocatedAmount { get; set; }

        public decimal CreditUsedAmount { get; set; }

        public decimal CreditAvailableAmount { get; set; }

        public string CreditStatus { get; set; } = string.Empty;

        public decimal BillChargeAmount { get; set; }

        public decimal BillChargeCoveredAmount { get; set; }

        public string BillChargeStatus { get; set; } = string.Empty;
    }
}