namespace RideOnServer.BL.DTOs.CompetitionSummary
{
    public class CompetitionSummaryClassDetailItem
    {
        public int ClassInCompId { get; set; }

        public DateTime ClassDate { get; set; }

        public TimeSpan? StartTime { get; set; }

        public short? OrderInDay { get; set; }

        public string ClassName { get; set; } = string.Empty;

        public int EntryCount { get; set; }

        public int PaidCount { get; set; }

        public int UnpaidCount { get; set; }

        public int FineCount { get; set; }

        public decimal ExpectedAmount { get; set; }

        public decimal PaidAmount { get; set; }

        public decimal UnpaidAmount { get; set; }
    }
}