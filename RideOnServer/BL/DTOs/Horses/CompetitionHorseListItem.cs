namespace RideOnServer.BL.DTOs.Horses
{
    public class CompetitionHorseListItem
    {
        public int HorseId { get; set; }

        public string HorseName { get; set; } = string.Empty;

        public string? BarnName { get; set; }

        public string? FederationNumber { get; set; }
    }
}