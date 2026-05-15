namespace RideOnServer.BL.DTOs.CompetitionSummary
{
    public class CompetitionSummaryStallEntryItem
    {
        public int StallBookingId { get; set; }

        public string BookingRanchName { get; set; } = string.Empty;

        public string ProductName { get; set; } = string.Empty;

        public bool IsForTack { get; set; }

        public string? HorseName { get; set; }

        public string? BarnName { get; set; }

        public DateTime StartDate { get; set; }

        public DateTime EndDate { get; set; }

        public string PayerNames { get; set; } = string.Empty;

        public bool IsPaid { get; set; }

        public decimal ExpectedAmount { get; set; }

        public decimal PaidAmount { get; set; }

        public decimal UnpaidAmount { get; set; }
    }
}