namespace RideOnServer.BL.DTOs
{
    public class ChangeSuperUserPasswordRequest
    {
        public string CurrentPassword { get; set; } = string.Empty;
        public string NewPassword { get; set; } = string.Empty;
    }
}