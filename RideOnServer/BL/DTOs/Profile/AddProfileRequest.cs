namespace RideOnServer.BL.DTOs.Profile
{
    public class AddProfileRequest
    {
        public int PersonId { get; set; }
        public int RanchId { get; set; }
        public byte RoleId { get; set; }
    }
}
