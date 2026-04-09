namespace RideOnServer.BL.DTOs.Workers
{
    public class UpdateWorkerRoleStatusRequest
    {
        public int PersonId { get; set; }

        public int RanchId { get; set; }

        public string RoleStatus { get; set; } = string.Empty;
    }
}