namespace RideOnServer.BL.DTOs.Payers
{
    public class PotentialPayerLookupResponse
    {
        public int PersonId { get; set; }

        public string FirstName { get; set; } = string.Empty;

        public string LastName { get; set; } = string.Empty;

        public string? NationalId { get; set; }

        public string? Email { get; set; }

        public string? CellPhone { get; set; }

        public bool HasSystemUser { get; set; }
    }
}