namespace RideOnServer.BL.DTOs
{
    public class AssignRoleRequest
    {
        public int PersonId { get; set; }
        public int RanchId { get; set; }
        public byte RoleId { get; set; }
    }
}
