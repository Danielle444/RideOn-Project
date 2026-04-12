namespace RideOnServer.BL.DTOs.Payers
{
    public class GetManagedPayersFiltersRequest
    {
        public int RanchId { get; set; }
        public string? SearchText { get; set; }
        public string? ApprovalStatus { get; set; }
    }
}