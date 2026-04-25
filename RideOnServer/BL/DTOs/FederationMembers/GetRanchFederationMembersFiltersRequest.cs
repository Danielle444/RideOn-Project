namespace RideOnServer.BL.DTOs.FederationMembers
{
    public class GetRanchFederationMembersFiltersRequest
    {
        public int RanchId { get; set; }

        public string? SearchText { get; set; }
    }
}