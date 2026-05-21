namespace RideOnServer.BL.DTOs.CompetitionSummary
{
    public class CompetitionSummaryPaymentBatchItem
    {
        public int PaymentBatchId { get; set; }

        public int BillId { get; set; }

        public int PayerPersonId { get; set; }

        public string PayerName { get; set; } = string.Empty;

        public string InvoiceNumber { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; }

        public string? EnteredByName { get; set; }

        public decimal BatchTotalAmount { get; set; }

        public decimal SelectedMethodAmount { get; set; }

        public string PaymentMethodsText { get; set; } = string.Empty;
    }
}