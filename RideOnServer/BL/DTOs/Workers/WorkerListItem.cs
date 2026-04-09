namespace RideOnServer.BL.DTOs.Workers
{
    public class WorkerListItem
    {
        public int PersonId { get; set; }

        public string FullName { get; set; } = string.Empty;

        public string FirstName { get; set; } = string.Empty;

        public string LastName { get; set; } = string.Empty;

        public string NationalId { get; set; } = string.Empty;

        public string? Email { get; set; }

        public string? CellPhone { get; set; }

        public string? Username { get; set; }

        public bool IsActive { get; set; }

        public int RanchId { get; set; }

        public string RanchName { get; set; } = string.Empty;

        public byte RoleId { get; set; }

        public string RoleName { get; set; } = string.Empty;

        public string RoleStatus { get; set; } = string.Empty;
    }
}