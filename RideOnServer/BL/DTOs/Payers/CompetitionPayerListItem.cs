namespace RideOnServer.BL.DTOs.Payers
{
    public class CompetitionPayerListItem
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

        public string? CellPhone { get; set; }

        public string? Email { get; set; }

        public decimal TotalAmount { get; set; }

        public decimal PaidAmount { get; set; }

        public string PaymentStatus { get; set; } = string.Empty;
    }
}