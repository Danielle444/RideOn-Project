namespace RideOnServer.BL.DTOs.CompetitionSummary
{
    public class CompetitionSummaryShavingsEntryItem
    {
        public int ShavingsOrderId { get; set; }

        public string BookingRanchName { get; set; } = string.Empty;

        public int StallCount { get; set; }

        public int BagQuantity { get; set; }

        public DateTime? RequestedDeliveryTime { get; set; }

        public string? DeliveryStatus { get; set; }

        public string HorseNames { get; set; } = string.Empty;

        public string PayerNames { get; set; } = string.Empty;

        public bool IsPaid { get; set; }

        public decimal ExpectedAmount { get; set; }

        public decimal PaidAmount { get; set; }

        public decimal UnpaidAmount { get; set; }
    }
}