namespace RideOnServer.BL.DTOs.Payers
{
    public class PayerManagerItem
    {
        public int AdminPersonId { get; set; }

        public string FirstName { get; set; } = string.Empty;

        public string LastName { get; set; } = string.Empty;

        public string? CellPhone { get; set; }

        public string? Email { get; set; }

        public int RanchId { get; set; }

        public string RanchName { get; set; } = string.Empty;

        public byte RoleId { get; set; }

        public string RoleName { get; set; } = string.Empty;

        public string ApprovalStatus { get; set; } = string.Empty;

        public DateTime? RequestDate { get; set; }

        public DateTime? UpdateDate { get; set; }
    }
}