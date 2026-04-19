namespace RideOnServer.BL.DTOs.Payers
{
    public class PendingPayerRegistrationItem
    {
        public int PersonId { get; set; }
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string? CellPhone { get; set; }
        public string Username { get; set; } = string.Empty;
        public int RanchId { get; set; }
        public string RanchName { get; set; } = string.Empty;
        public short RoleId { get; set; }
        public DateTime RequestDate { get; set; }
    }
}
