namespace RideOnServer.BL.DTOs.Auth.SuperUser
{
    public class UpdatePersonRoleStatusRequest
    {
        public int PersonId { get; set; }

        public int RanchId { get; set; }

        public byte RoleId { get; set; }

        public string RoleStatus { get; set; } = string.Empty;
    }
}