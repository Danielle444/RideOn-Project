namespace RideOnServer.BL.DTOs.Auth
{
    public class ChangeSuperUserPasswordRequest
    {
        public string CurrentPassword { get; set; } = string.Empty;
        public string NewPassword { get; set; } = string.Empty;
    }
}