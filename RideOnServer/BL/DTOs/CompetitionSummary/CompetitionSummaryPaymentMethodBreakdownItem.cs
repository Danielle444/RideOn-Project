namespace RideOnServer.BL.DTOs.CompetitionSummary
{
    public class CompetitionSummaryPaymentMethodBreakdownItem
    {
        public int PaymentMethodId { get; set; }

        public string PaymentMethodType { get; set; } = string.Empty;

        public int PaymentBatchCount { get; set; }

        public decimal AmountPaid { get; set; }
    }
}