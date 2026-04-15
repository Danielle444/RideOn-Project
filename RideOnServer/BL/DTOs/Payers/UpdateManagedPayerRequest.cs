namespace RideOnServer.BL.DTOs.Payers
{
    public class UpdateManagedPayerRequest
    {
        public int RanchId { get; set; }

        public int PersonId { get; set; }

        public string FirstName { get; set; } = string.Empty;

        public string LastName { get; set; } = string.Empty;

        public string? Email { get; set; }

        public string? CellPhone { get; set; }
    }
}