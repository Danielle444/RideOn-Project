namespace RideOnServer.BL.DTOs.CompetitionPayments
{
    public class CompetitionPayerAccountSummaryItem
    {
        public int BillId { get; set; }

        public int PayerPersonId { get; set; }

        public string PayerName { get; set; } = string.Empty;

        public string ChargeOwner { get; set; } = string.Empty;

        public decimal TotalAmount { get; set; }

        public decimal PaidAmount { get; set; }

        public decimal UnpaidAmount { get; set; }

        public string PaymentStatus { get; set; } = string.Empty;
    }
}