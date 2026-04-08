namespace RideOnServer.BL
{
    public class Maneuver
    {
        public short ManeuverId { get; set; }

        public string ManeuverName { get; set; } = string.Empty;

        public string ManeuverDescription { get; set; } = string.Empty;
    }
}