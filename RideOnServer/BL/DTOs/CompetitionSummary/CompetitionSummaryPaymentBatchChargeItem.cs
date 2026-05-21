namespace RideOnServer.BL.DTOs.CompetitionSummary
{
    public class CompetitionSummaryPaymentBatchChargeItem
    {
        public int BillChargeId { get; set; }

        public string ChargeOwner { get; set; } = string.Empty;

        public string CategoryKey { get; set; } = string.Empty;

        public string SourceType { get; set; } = string.Empty;

        public int SourceId { get; set; }

        public string MainName { get; set; } = string.Empty;

        public string? ProductDetailsText { get; set; }

        public string? RiderName { get; set; }

        public string? HorseName { get; set; }

        public string? BarnName { get; set; }

        public decimal AmountToPay { get; set; }

        public string? Notes { get; set; }
    }
}