namespace RideOnServer.BL.DTOs.StallBookings
{
    public class HorseForStallBookingItem
    {
        public int HorseId { get; set; }
        public string HorseName { get; set; } = string.Empty;
        public string? BarnName { get; set; }
        public string? FederationNumber { get; set; }
    }
}