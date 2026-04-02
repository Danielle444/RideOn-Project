namespace RideOnServer.BL.DTOs
{
    public class ChangeSuperUserPasswordRequest
    {
        public int SuperUserId { get; set; }
        public string CurrentPassword { get; set; } = string.Empty;
        public string NewPassword { get; set; } = string.Empty;
    }
}