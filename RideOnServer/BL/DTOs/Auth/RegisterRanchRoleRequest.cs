namespace RideOnServer.BL.DTOs.Auth
{
    public class RegisterRanchRoleRequest
    {
        public int RanchId { get; set; }

        public byte RoleId { get; set; }
    }
}