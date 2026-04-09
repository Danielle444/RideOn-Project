namespace RideOnServer.BL.DTOs.Workers
{
    public class UpdateWorkerRequest
    {
        public int PersonId { get; set; }

        public int RanchId { get; set; }

        public string FirstName { get; set; } = string.Empty;

        public string LastName { get; set; } = string.Empty;

        public string? Gender { get; set; }

        public string? CellPhone { get; set; }

        public string? Email { get; set; }
    }
}