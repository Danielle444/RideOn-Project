using RideOnServer.BL.DTOs.ServicePrices;

namespace RideOnServer.BL.DTOs.Competition.Invitation
{
    public class CompetitionInvitationDetailsResponse
    {
        public CompetitionSummaryDto Competition { get; set; } = new CompetitionSummaryDto();
        public List<string> Judges { get; set; } = new List<string>();
        public List<CompetitionClassInvitationItemDto> Classes { get; set; } = new List<CompetitionClassInvitationItemDto>();
        public List<CompetitionPaidTimeInvitationItemDto> PaidTimeSlots { get; set; } = new List<CompetitionPaidTimeInvitationItemDto>();
        public List<ServicePriceCategorySection> ServicePriceSections { get; set; } = new List<ServicePriceCategorySection>();
    }
}