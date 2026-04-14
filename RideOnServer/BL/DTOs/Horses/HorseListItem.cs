namespace RideOnServer.BL.DTOs.Horses
{
    public class HorseListItem
    {
        public int HorseId { get; set; }

        public int RanchId { get; set; }

        public string RanchName { get; set; } = string.Empty;

        public string HorseName { get; set; } = string.Empty;

        public string? BarnName { get; set; }

        public string? FederationNumber { get; set; }

        public string? ChipNumber { get; set; }

        public short? BirthYear { get; set; }

        public string? Gender { get; set; }
    }
}