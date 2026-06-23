namespace RideOnServer.BL.DTOs.StallMap
{
    public class AssignedStallPriceDto
    {
        public int AssignmentId { get; set; }
        public short CompoundId { get; set; }
        public short StallId { get; set; }
        public int HorseId { get; set; }
        public decimal AssignedPrice { get; set; }
        public string ProductName { get; set; } = string.Empty;
    }
}
