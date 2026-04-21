namespace RideOnServer.BL.DTOs.Auth.SuperUser
{
    public class CreateSuperUserRequest
    {
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }
}