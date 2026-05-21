namespace RideOnServer.BL.DTOs.CompetitionSummary
{
    public class CompetitionSummaryPaymentBatchMethodItem
    {
        public int PaymentId { get; set; }

        public int PaymentBatchId { get; set; }

        public int PaymentMethodId { get; set; }

        public string PaymentMethodType { get; set; } = string.Empty;

        public decimal AmountPaid { get; set; }

        public DateTime PaymentDate { get; set; }

        public string? InvoiceNumber { get; set; }

        public string? TransactionReference { get; set; }
    }
}