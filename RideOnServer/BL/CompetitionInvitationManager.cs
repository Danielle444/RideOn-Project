using RideOnServer.BL.DTOs.Competition.Invitation;
using RideOnServer.BL.DTOs.ServicePrices;
using RideOnServer.DAL;

namespace RideOnServer.BL
{
    public class CompetitionInvitationManager
    {
        internal static CompetitionInvitationDetailsResponse GetInvitationDetails(int competitionId)
        {
            if (competitionId <= 0)
            {
                throw new Exception("CompetitionId is invalid");
            }

            Competition competition = Competition.GetCompetitionById(competitionId)
                ?? throw new Exception("Competition not found");

            List<ClassInCompetition> classes = ClassInCompetition.GetClassesByCompetitionId(competitionId);
            List<PaidTimeSlotInCompetition> paidTimeSlots = PaidTimeSlotInCompetition.GetPaidTimeSlotsByCompetitionId(competitionId);

            ServicePriceDAL servicePriceDal = new ServicePriceDAL();
            List<ServicePriceRow> priceRows = servicePriceDal.GetServicePricingDashboard(competition.HostRanchId);

            List<ServicePriceCategorySection> priceSections = priceRows
                .GroupBy(x => new { x.CategoryId, x.CategoryName })
                .Select(group => new ServicePriceCategorySection
                {
                    CategoryId = group.Key.CategoryId,
                    CategoryName = group.Key.CategoryName,
                    Items = group.OrderBy(x => x.ProductId).ToList()
                })
                .OrderBy(x => x.CategoryId)
                .ToList();

            CompetitionDAL competitionDal = new CompetitionDAL();
            List<string> judges = competitionDal.GetJudgeNamesByCompetitionId(competitionId);

            return new CompetitionInvitationDetailsResponse
            {
                Competition = new CompetitionSummaryDto
                {
                    CompetitionId = competition.CompetitionId,
                    HostRanchId = competition.HostRanchId,
                    HostRanchName = competition.HostRanchName,
                    FieldId = competition.FieldId,
                    FieldName = competition.FieldName,
                    CompetitionName = competition.CompetitionName,
                    CompetitionStartDate = competition.CompetitionStartDate,
                    CompetitionEndDate = competition.CompetitionEndDate,
                    RegistrationOpenDate = competition.RegistrationOpenDate,
                    RegistrationEndDate = competition.RegistrationEndDate,
                    PaidTimeRegistrationDate = competition.PaidTimeRegistrationDate,
                    PaidTimePublicationDate = competition.PaidTimePublicationDate,
                    CompetitionStatus = competition.CompetitionStatus,
                    Notes = competition.Notes,
                    StallMapUrl = competition.StallMapUrl
                },
                Judges = judges,
                Classes = classes.Select(x => new CompetitionClassInvitationItemDto
                {
                    ClassInCompId = x.ClassInCompId,
                    ClassName = x.ClassName,
                    ClassDateTime = x.ClassDateTime,
                    StartTime = x.StartTime,
                    OrderInDay = x.OrderInDay,
                    ArenaName = x.ArenaName,
                    JudgesDisplay = x.JudgesDisplay,
                    OrganizerCost = x.OrganizerCost,
                    FederationCost = x.FederationCost,
                    TotalPrice = (x.OrganizerCost ?? 0) + (x.FederationCost ?? 0),
                    PrizeTypeName = x.PrizeTypeName,
                    PrizeAmount = x.PrizeAmount
                }).ToList(),
                PaidTimeSlots = paidTimeSlots.Select(x => new CompetitionPaidTimeInvitationItemDto
                {
                    PaidTimeSlotInCompId = x.PaidTimeSlotInCompId,
                    SlotDate = x.SlotDate,
                    TimeOfDay = x.TimeOfDay,
                    StartTime = x.StartTime,
                    EndTime = x.EndTime,
                    ArenaName = x.ArenaName
                }).ToList(),
                ServicePriceSections = priceSections
            };
        }
    }
}