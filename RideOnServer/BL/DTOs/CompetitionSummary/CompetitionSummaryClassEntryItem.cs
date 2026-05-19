namespace RideOnServer.BL.DTOs.CompetitionSummary
{
    public class CompetitionSummaryClassEntryItem
    {
        public int EntryId { get; set; }

        public short? DrawOrder { get; set; }

        public string RiderName { get; set; } = string.Empty;

        public string HorseName { get; set; } = string.Empty;

        public string? BarnName { get; set; }

        public string? CoachName { get; set; }

        public string PayerName { get; set; } = string.Empty;

        public string? PrizeRecipientName { get; set; }

        public string? FineName { get; set; }

        public decimal FineAmount { get; set; }

        public bool IsPaid { get; set; }

        public decimal Amount { get; set; }
    }
}