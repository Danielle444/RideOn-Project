namespace RideOnServer.BL.DTOs.ShavingsOrders
{
    public class ShavingsOrderDetailsItem
    {
        public int StallBookingId { get; set; }
        public int? HorseId { get; set; }
        public string? HorseName { get; set; }
        public short BagQuantityPerStall { get; set; }
    }
}