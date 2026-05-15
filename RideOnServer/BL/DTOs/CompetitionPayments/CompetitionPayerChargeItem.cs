namespace RideOnServer.BL.DTOs.CompetitionPayments
{
    public class CompetitionPayerChargeItem
    {
        public int BillChargeId { get; set; }

        public int BillId { get; set; }

        public string ChargeOwner { get; set; } = string.Empty;

        public string CategoryKey { get; set; } = string.Empty;

        public string SourceType { get; set; } = string.Empty;

        public int SourceId { get; set; }

        public DateTime? DisplayDate { get; set; }

        public string MainName { get; set; } = string.Empty;

        public string? RiderName { get; set; }

        public string? HorseName { get; set; }

        public string? BarnName { get; set; }

        public string? CoachName { get; set; }

        public string PayerName { get; set; } = string.Empty;

        public decimal AmountToPay { get; set; }

        public string ChargeStatus { get; set; } = string.Empty;

        public int? PaymentBatchId { get; set; }

        public string? InvoiceNumber { get; set; }

        public bool CanSelectForPayment { get; set; }
    }
}