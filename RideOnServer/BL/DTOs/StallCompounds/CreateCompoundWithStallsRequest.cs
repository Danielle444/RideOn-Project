namespace RideOnServer.BL.DTOs.StallCompounds
{
    public class CreateCompoundWithStallsRequest
    {
        public int RanchId { get; set; }
        public string CompoundName { get; set; } = string.Empty;
        public short StallTypeProductId { get; set; }
        public string NumberingPattern { get; set; } = string.Empty;
    }
}