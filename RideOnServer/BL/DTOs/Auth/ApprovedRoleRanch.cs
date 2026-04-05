namespace RideOnServer.BL.DTOs.Auth
{
    public class ApprovedRoleRanch
    {
        public int RanchId { get; set; }

        public string RanchName { get; set; } = string.Empty;

        public byte RoleId { get; set; }

        public string RoleName { get; set; } = string.Empty;
    }
}