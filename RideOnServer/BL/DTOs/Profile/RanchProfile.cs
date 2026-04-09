namespace RideOnServer.BL.DTOs.Profile
{
    public class RanchProfile
    {
        public int RanchId { get; set; }

        public string RanchName { get; set; } = string.Empty;

        public string? ContactEmail { get; set; }

        public string? ContactPhone { get; set; }

        public string? WebsiteUrl { get; set; }

        public double? Latitude { get; set; }

        public double? Longitude { get; set; }
    }
}