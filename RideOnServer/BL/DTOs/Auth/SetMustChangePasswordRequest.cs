namespace RideOnServer.BL.DTOs.Auth
{
    public class SetMustChangePasswordRequest
    {
        public int SystemUserId { get; set; }

        public bool MustChangePassword { get; set; }
    }
}