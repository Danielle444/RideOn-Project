namespace RideOnServer.BL.DTOs.Workers
{
    public class GetWorkersFiltersRequest
    {
        public int RanchId { get; set; }

        public string? RoleStatus { get; set; }

        public string? SearchText { get; set; }
    }
}