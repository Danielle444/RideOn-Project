namespace RideOnServer.BL
{
    public class StallBooking : ProductRequest
    {
        public DateTime? CheckInDate { get; set; }

        public DateTime? CheckOutDate { get; set; }

        public bool? IsForTack { get; set; }

        public int RanchId { get; set; }

        public byte CompoundID { get; set; }

        public short StallNumber { get; set; }

        public int? HorseId { get; set; }
    }
}