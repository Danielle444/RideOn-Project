namespace RideOnServer.BL.DTOs.CompetitionSummary
{
    public class CompetitionSummaryStallDetailItem
    {
        public int BookingRanchId { get; set; }

        public string BookingRanchName { get; set; } = string.Empty;

        public short ProductId { get; set; }

        public string ProductName { get; set; } = string.Empty;

        public bool IsForTack { get; set; }

        public int BookingCount { get; set; }

        public int HorseCount { get; set; }

        public int TackCount { get; set; }

        public decimal ExpectedAmount { get; set; }

        public decimal PaidAmount { get; set; }

        public decimal UnpaidAmount { get; set; }
    }
}