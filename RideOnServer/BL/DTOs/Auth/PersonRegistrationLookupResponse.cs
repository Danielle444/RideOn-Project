namespace RideOnServer.BL.DTOs.Auth
{
    public class PersonRegistrationLookupResponse
    {
        public int PersonId { get; set; }

        public string NationalId { get; set; } = string.Empty;

        public string FirstName { get; set; } = string.Empty;

        public string LastName { get; set; } = string.Empty;

        public string? Gender { get; set; }

        public DateTime? DateOfBirth { get; set; }

        public string? CellPhone { get; set; }

        public string? Email { get; set; }

        public bool HasSystemUser { get; set; }
    }
}