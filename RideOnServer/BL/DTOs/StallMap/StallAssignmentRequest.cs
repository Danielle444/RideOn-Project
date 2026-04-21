namespace RideOnServer.BL.DTOs.StallMap
{
    public class StallAssignmentRequest
    {
        public int CompetitionId { get; set; }
        public int RanchId { get; set; }
        public short CompoundId { get; set; }
        public short StallId { get; set; }
        public int HorseId { get; set; }
    }

    public class UnassignStallRequest
    {
        public int CompetitionId { get; set; }
        public int RanchId { get; set; }
        public short CompoundId { get; set; }
        public short StallId { get; set; }
    }

    public class SaveLayoutRequest
    {
        public int RanchId { get; set; }
        public short CompoundId { get; set; }
        public string LayoutJson { get; set; } = string.Empty;
    }
}
