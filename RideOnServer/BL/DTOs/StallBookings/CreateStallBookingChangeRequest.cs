namespace RideOnServer.BL.DTOs.StallBookings
{
    public class CreateStallBookingChangeRequest
    {
        public int OriginalStallBookingId { get; set; }

        public int RanchId { get; set; }

        public int NewPriceCatalogId { get; set; }

        public DateTime NewStartDate { get; set; }

        public DateTime NewEndDate { get; set; }

        public string? Notes { get; set; }
    }
}