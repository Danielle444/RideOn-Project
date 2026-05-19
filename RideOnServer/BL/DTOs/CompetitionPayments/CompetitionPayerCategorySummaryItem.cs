namespace RideOnServer.BL.DTOs.CompetitionPayments
{
    public class CompetitionPayerCategorySummaryItem
    {
        public string ChargeOwner { get; set; } = string.Empty;

        public string CategoryKey { get; set; } = string.Empty;

        public string CategoryName { get; set; } = string.Empty;

        public int ChargeCount { get; set; }

        public decimal TotalAmount { get; set; }

        public decimal PaidAmount { get; set; }

        public decimal UnpaidAmount { get; set; }

        public string PaymentStatus { get; set; } = string.Empty;
    }
}