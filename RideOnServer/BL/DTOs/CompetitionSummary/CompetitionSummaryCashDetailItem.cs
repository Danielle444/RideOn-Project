namespace RideOnServer.BL.DTOs.CompetitionSummary
{
    public class CompetitionSummaryCashDetailItem
    {
        public int PaymentId { get; set; }

        public int BillId { get; set; }

        public string PayerName { get; set; } = string.Empty;

        public decimal AmountPaid { get; set; }

        public DateTime PaymentDate { get; set; }

        public string PaymentMethodType { get; set; } = string.Empty;

        public string? TransactionReference { get; set; }

        public string? EnteredByName { get; set; }
    }
}