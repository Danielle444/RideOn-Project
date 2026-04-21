namespace RideOnServer.BL.DTOs.Horses
{
    public class GetCompetitionHorsesFiltersRequest
    {
        public int CompetitionId { get; set; }

        public int RanchId { get; set; }

        public string? SearchText { get; set; }
    }
}