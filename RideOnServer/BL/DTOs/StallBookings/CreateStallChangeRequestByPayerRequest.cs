namespace RideOnServer.BL.DTOs.StallBookings
{
    public class CreateStallChangeRequestByPayerRequest
    {
        public int StallBookingId { get; set; }

        public int RanchId { get; set; }

        public DateTime NewStartDate { get; set; }

        public DateTime NewEndDate { get; set; }

        public string? Notes { get; set; }
    }
}
