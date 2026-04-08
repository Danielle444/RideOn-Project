namespace RideOnServer.BL.DTOs.StallCompounds
{
    public class StallCompoundSummary
    {
        public int RanchId { get; set; }
        public short CompoundId { get; set; }
        public string CompoundName { get; set; } = string.Empty;
        public short StallTypeProductId { get; set; }
        public string StallTypeName { get; set; } = string.Empty;
        public int StallCount { get; set; }
    }
}