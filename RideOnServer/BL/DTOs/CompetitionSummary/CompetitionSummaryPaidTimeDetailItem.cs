namespace RideOnServer.BL.DTOs.CompetitionSummary
{
    public class CompetitionSummaryPaidTimeDetailItem
    {
        public int PaidTimeSlotInCompId { get; set; }

        public DateTime SlotDate { get; set; }

        public TimeSpan StartTime { get; set; }

        public TimeSpan EndTime { get; set; }

        public string ArenaName { get; set; } = string.Empty;

        public short ProductId { get; set; }

        public string ProductName { get; set; } = string.Empty;

        public int DurationMinutes { get; set; }

        public int RequestCount { get; set; }

        public int PaidCount { get; set; }

        public int UnpaidCount { get; set; }

        public decimal ExpectedAmount { get; set; }

        public decimal PaidAmount { get; set; }

        public decimal UnpaidAmount { get; set; }
    }
}