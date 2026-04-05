namespace RideOnServer.BL.DTOs.Auth
{
    public class ChangePasswordRequest
    {
        public string Username { get; set; } = string.Empty;

        public string CurrentPassword { get; set; } = string.Empty;

        public string NewPassword { get; set; } = string.Empty;
    }
}