namespace RideOnServer.BL
{
    public class PatternManeuver
    {
        public short PatternNumber { get; set; }
        public short ManeuverId { get; set; }
        public short ManeuverOrder { get; set; }

        public string? ManeuverName { get; set; }
        public string? ManeuverDescription { get; set; }
    }
}