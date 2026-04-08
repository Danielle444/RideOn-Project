namespace RideOnServer.BL
{
    public class PatternWithManeuvers
    {
        public short PatternNumber { get; set; }

        public List<PatternManeuver> Maneuvers { get; set; } = new List<PatternManeuver>();
    }
}