namespace RideOnServer.BL.DTOs.Auth
{
    public class LoginResponse
    {
        public int PersonId { get; set; }

        public string Username { get; set; } = string.Empty;

        public string FirstName { get; set; } = string.Empty;

        public string LastName { get; set; } = string.Empty;

        public bool IsActive { get; set; }

        public bool MustChangePassword { get; set; }

        public string Token { get; set; } = string.Empty;

        public List<ApprovedRoleRanch> ApprovedRolesAndRanches { get; set; } = new List<ApprovedRoleRanch>();
    }
}