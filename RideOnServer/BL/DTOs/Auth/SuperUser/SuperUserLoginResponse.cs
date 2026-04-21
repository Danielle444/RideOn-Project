namespace RideOnServer.BL.DTOs.Auth.SuperUser
{
    public class SuperUserLoginResponse
    {
        public int SuperUserId { get; set; }
        public string Email { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        public bool MustChangePassword { get; set; }
        public string Token { get; set; } = string.Empty;
    }
}