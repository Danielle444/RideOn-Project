namespace RideOnServer.BL.DTOs.Auth
{
    public class CreateRanchRequest
    {
        public string RanchName { get; set; } = string.Empty;
        public string? ContactEmail { get; set; }
        public string? ContactPhone { get; set; }
        public string? WebsiteUrl { get; set; }
        public double? Latitude { get; set; }
        public double? Longitude { get; set; }

        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string NationalId { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string CellPhone { get; set; } = string.Empty;
    }
}