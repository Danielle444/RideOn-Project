namespace RideOnServer.BL.DTOs.Profile
{
    public class UpdateUserProfileRequest
    {
        public int PersonId { get; set; }

        public string FirstName { get; set; } = string.Empty;

        public string LastName { get; set; } = string.Empty;

        public string? Gender { get; set; }

        public string? CellPhone { get; set; }

        public string? Email { get; set; }
    }
}