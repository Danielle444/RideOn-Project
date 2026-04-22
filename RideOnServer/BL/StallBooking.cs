namespace RideOnServer.BL
{
    public class StallBooking : ProductRequest
    {
        public int StallRanchId { get; set; }

        public byte? StallCompoundId { get; set; }

        public int? StallId { get; set; }

        public int? HorseId { get; set; }

        public DateTime CheckInDate { get; set; }

        public DateTime CheckOutDate { get; set; }

        public bool IsForTack { get; set; }
    }
}