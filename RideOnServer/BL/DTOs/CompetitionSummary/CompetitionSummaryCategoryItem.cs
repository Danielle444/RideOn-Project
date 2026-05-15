namespace RideOnServer.BL.DTOs.CompetitionSummary
{
    public class CompetitionSummaryCategoryItem
    {
        public string SectionKey { get; set; } = string.Empty;

        public string CategoryKey { get; set; } = string.Empty;

        public string CategoryName { get; set; } = string.Empty;

        public int Quantity { get; set; }

        public decimal ExpectedAmount { get; set; }

        public decimal PaidAmount { get; set; }

        public decimal UnpaidAmount { get; set; }
    }
}