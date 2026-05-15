using RideOnServer.BL.DTOs.CompetitionSummary;
using RideOnServer.DAL;

namespace RideOnServer.BL
{
    public class CompetitionSummary
    {
        public static CompetitionSummaryResponse GetCompetitionSummary(
            int competitionId,
            int ranchId)
        {
            if (competitionId <= 0)
            {
                throw new Exception("Invalid CompetitionId");
            }

            if (ranchId <= 0)
            {
                throw new Exception("Invalid RanchId");
            }

            CompetitionSummaryDAL dal = new CompetitionSummaryDAL();

            List<CompetitionSummaryCategoryItem> items =
                dal.GetCompetitionSummaryByCategory(
                    competitionId,
                    ranchId
                );

            CompetitionSummaryResponse response =
                new CompetitionSummaryResponse();

            response.OrganizerCategories =
                items
                    .Where(item => item.SectionKey == "organizer")
                    .ToList();

            response.FederationCategories =
                items
                    .Where(item => item.SectionKey == "federation")
                    .ToList();

            response.Organizer =
                BuildTotals(response.OrganizerCategories);

            response.Federation =
                BuildTotals(response.FederationCategories);

            return response;
        }

        private static CompetitionSummaryAmountDto BuildTotals(
            List<CompetitionSummaryCategoryItem> items)
        {
            return new CompetitionSummaryAmountDto
            {
                ExpectedAmount =
                    items.Sum(item => item.ExpectedAmount),

                PaidAmount =
                    items.Sum(item => item.PaidAmount),

                UnpaidAmount =
                    items.Sum(item => item.UnpaidAmount)
            };
        }
    }
}