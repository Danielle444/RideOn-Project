namespace RideOnServer.BL.DTOs.Auth
{
    public class RegisterRequest
    {
        public string NationalId { get; set; } = string.Empty;
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string? Gender { get; set; }
        public DateTime? DateOfBirth { get; set; }
        public string CellPhone { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Username { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;

        public List<RegisterRanchRoleRequest> RanchRoles { get; set; } = new();
    }
}