namespace RideOnServer.BL.DTOs.Payers
{
    public class ManagedPayerListItem
    {
        public int PersonId { get; set; }

        public string FirstName { get; set; } = string.Empty;

        public string LastName { get; set; } = string.Empty;

        public string FullName
        {
            get
            {
                return (FirstName + " " + LastName).Trim();
            }
        }

        public string NationalId { get; set; } = string.Empty;

        public string? CellPhone { get; set; }

        public string? Email { get; set; }

        public string? Username { get; set; }

        public bool IsActive { get; set; }

        public DateTime RequestDate { get; set; }

        public string ApprovalStatus { get; set; } = string.Empty;

        public int RanchId { get; set; }

        public string RanchName { get; set; } = string.Empty;

        public byte RoleId { get; set; }

        public string RoleName { get; set; } = string.Empty;
    }
}