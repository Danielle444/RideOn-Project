namespace RideOnServer.BL.DTOs.FederationMembers
{
    public class GetCompetitionFederationMembersFiltersRequest
    {
        public int CompetitionId { get; set; }

        public int RanchId { get; set; }

        public string? SearchText { get; set; }
    }
}