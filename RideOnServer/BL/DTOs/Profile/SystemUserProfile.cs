namespace RideOnServer.BL.DTOs.Profile
{
    public class SystemUserProfile
    {
        public int PersonId { get; set; }

        public string Username { get; set; } = string.Empty;

        public string FirstName { get; set; } = string.Empty;

        public string LastName { get; set; } = string.Empty;

        public string NationalId { get; set; } = string.Empty;

        public string? Gender { get; set; }

        public DateTime? DateOfBirth { get; set; }

        public string? CellPhone { get; set; }

        public string? Email { get; set; }

        public bool IsActive { get; set; }

        public bool MustChangePassword { get; set; }

        public DateTime CreatedDate { get; set; }
    }
}