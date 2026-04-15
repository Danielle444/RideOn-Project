namespace RideOnServer.BL.DTOs.StallMap
{
    public class StallMapCompoundDto
    {
        public short CompoundId { get; set; }
        public string CompoundName { get; set; } = string.Empty;
        public string? LayoutJson { get; set; }
    }

    public class StallAssignmentDto
    {
        public short CompoundId { get; set; }
        public short StallId { get; set; }
        public string? StallNumber { get; set; }
        public int HorseId { get; set; }
        public string HorseName { get; set; } = string.Empty;
        public string? BarnName { get; set; }
    }

    public class HorseForMapDto
    {
        public int HorseId { get; set; }
        public string HorseName { get; set; } = string.Empty;
        public string? BarnName { get; set; }
    }
}
