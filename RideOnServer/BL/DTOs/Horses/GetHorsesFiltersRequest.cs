namespace RideOnServer.BL.DTOs.Horses
{
    public class GetHorsesFiltersRequest
    {
        public int RanchId { get; set; }

        public string? SearchText { get; set; }
    }
}