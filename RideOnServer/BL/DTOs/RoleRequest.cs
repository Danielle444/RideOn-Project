namespace RideOnServer.BL.DTOs
{
    public class RoleRequest
    {
        public int PersonId { get; set; }
        public int RanchId { get; set; }
        public byte RoleId { get; set; }

        public string FullName { get; set; } = string.Empty;
        public string NationalId { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string? CellPhone { get; set; }

        public string RanchName { get; set; } = string.Empty;
        public string RoleName { get; set; } = string.Empty;
        public string RoleStatus { get; set; } = string.Empty;
    }
}