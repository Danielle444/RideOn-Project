namespace RideOnServer.BL.DTOs.Payers
{
    public class GetCompetitionPayersFiltersRequest
    {
        public int CompetitionId { get; set; }
        public int RanchId { get; set; }
        public string? SearchText { get; set; }
    }
}