namespace RideOnServer.BL.DTOs.ShavingsOrders
{
    public class ShavingsDestinationCompound
    {
        public int CompoundId { get; set; }
        public string CompoundName { get; set; } = string.Empty;
        public List<ShavingsDestinationStall> Stalls { get; set; } = new();
    }
}
