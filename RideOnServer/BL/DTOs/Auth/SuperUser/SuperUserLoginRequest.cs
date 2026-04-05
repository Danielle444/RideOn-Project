namespace RideOnServer.BL.DTOs.Auth.SuperUser
{
    public class SuperUserLoginRequest
    {
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }
}