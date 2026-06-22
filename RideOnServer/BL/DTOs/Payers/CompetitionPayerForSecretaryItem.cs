namespace RideOnServer.BL.DTOs.Payers
{
    public class CompetitionPayerForSecretaryItem
    {
        public int PayerPersonId { get; set; }

        public string FirstName { get; set; } = string.Empty;

        public string LastName { get; set; } = string.Empty;

        public string FullName { get; set; } = string.Empty;

        public string? Email { get; set; }

        public string? CellPhone { get; set; }

        public int? OpenBillId { get; set; }
    }
}
