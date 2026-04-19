namespace RideOnServer.BL.DTOs.Payers
{
    public class CreatePayerWithCredentialsRequest
    {
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? CellPhone { get; set; }
        public int RanchId { get; set; }
    }
}
