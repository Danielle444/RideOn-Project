namespace RideOnServer.BL
{
    public class ShavingsOrderForStallBooking
    {
        public int ShavingsOrderId { get; set; }

        public int StallBookingId { get; set; }

        public byte BagQuantityPerStall { get; set; }
    }
}