namespace RideOnServer.BL.DTOs.StallBookings
{
    public class SecretaryUpdateStallBookingRequest
    {
        public int StallBookingId { get; set; }

        public int RanchId { get; set; }

        public DateTime NewStartDate { get; set; }

        public DateTime NewEndDate { get; set; }

        public string? Notes { get; set; }

        public bool? IsForTack { get; set; }

        public int? HorseId { get; set; }
    }
}
