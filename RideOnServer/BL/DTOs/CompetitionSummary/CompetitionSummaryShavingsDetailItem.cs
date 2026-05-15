namespace RideOnServer.BL.DTOs.CompetitionSummary
{
    public class CompetitionSummaryShavingsDetailItem
    {
        public int BookingRanchId { get; set; }

        public string BookingRanchName { get; set; } = string.Empty;

        public int OrderCount { get; set; }

        public int StallCount { get; set; }

        public int BagQuantity { get; set; }

        public decimal ExpectedAmount { get; set; }

        public decimal PaidAmount { get; set; }

        public decimal UnpaidAmount { get; set; }
    }
}