namespace RideOnServer.BL.DTOs.CompetitionSummary
{
    public class CompetitionSummaryPaidTimeEntryItem
    {
        public int PaidTimeRequestId { get; set; }

        public DateTime SlotDate { get; set; }

        public TimeSpan StartTime { get; set; }

        public TimeSpan EndTime { get; set; }

        public string ArenaName { get; set; } = string.Empty;

        public string ProductName { get; set; } = string.Empty;

        public int DurationMinutes { get; set; }

        public string RiderName { get; set; } = string.Empty;

        public string HorseName { get; set; } = string.Empty;

        public string? BarnName { get; set; }

        public string? CoachName { get; set; }

        public string PayerName { get; set; } = string.Empty;

        public string Status { get; set; } = string.Empty;

        public bool IsPaid { get; set; }

        public decimal Amount { get; set; }
    }
}