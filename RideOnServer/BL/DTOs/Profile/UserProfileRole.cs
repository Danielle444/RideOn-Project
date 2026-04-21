namespace RideOnServer.BL.DTOs.Profile
{
    public class UserProfileRole
    {
        public int RanchId { get; set; }

        public string RanchName { get; set; } = string.Empty;

        public byte RoleId { get; set; }

        public string RoleName { get; set; } = string.Empty;

        public string RoleStatus { get; set; } = string.Empty;
    }
}