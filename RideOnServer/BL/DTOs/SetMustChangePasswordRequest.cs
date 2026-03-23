namespace RideOnServer.BL.DTOs
{
    public class SetMustChangePasswordRequest
    {
        public int SystemUserId { get; set; }

        public bool MustChangePassword { get; set; }
    }
}