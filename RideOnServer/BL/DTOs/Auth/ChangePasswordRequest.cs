namespace RideOnServer.BL.DTOs.Auth
{
    public class ChangePasswordRequest
    {
        public int PersonId { get; set; }  
        public string CurrentPassword { get; set; }
        public string NewPassword { get; set; }
    }
}