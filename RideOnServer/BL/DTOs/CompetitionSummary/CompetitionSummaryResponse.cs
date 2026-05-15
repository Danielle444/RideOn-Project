namespace RideOnServer.BL.DTOs.CompetitionSummary
{
    public class CompetitionSummaryResponse
    {
        public CompetitionSummaryAmountDto Organizer { get; set; } =
            new CompetitionSummaryAmountDto();

        public CompetitionSummaryAmountDto Federation { get; set; } =
            new CompetitionSummaryAmountDto();

        public List<CompetitionSummaryCategoryItem> OrganizerCategories { get; set; } =
            new List<CompetitionSummaryCategoryItem>();

        public List<CompetitionSummaryCategoryItem> FederationCategories { get; set; } =
            new List<CompetitionSummaryCategoryItem>();
    }
}