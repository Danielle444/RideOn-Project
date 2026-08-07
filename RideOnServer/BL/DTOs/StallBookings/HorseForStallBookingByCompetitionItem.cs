namespace RideOnServer.BL.DTOs.StallBookings
{
    public class HorseForStallBookingByCompetitionItem
    {
        public int HorseId { get; set; }
        public string HorseName { get; set; } = string.Empty;
        public string? BarnName { get; set; }
        public string? FederationNumber { get; set; }
        public int RanchId { get; set; }
        public string RanchName { get; set; } = string.Empty;
    }
}
