namespace RideOnServer.BL.DTOs.StallBookings
{
    // Admin-direct stall booking edit (mirrors AdminEditEntryRequest's shape
    // and its deliberate omission of any actor-identity field -- personId is
    // threaded as a separate method parameter, never bound from the request
    // body). See StallBookingsController.AdminEditStallBooking.
    //
    // RanchId is the booking's OWN requesting ranch (the admin's approved
    // ranch), verified server-side inside usp_admineditstallbooking against
    // stallbooking.requestingranchid -- never trusted blindly beyond the
    // controller's role check.
    //
    // NewProductId is optional: omit it (or send the booking's current
    // product) to leave the product/type unchanged. The server independently
    // re-derives whether the booking is assigned to a physical stall and
    // rejects a real product change on an assigned booking regardless of
    // what the client sends.
    public class AdminEditStallBookingRequest
    {
        public int StallBookingId { get; set; }

        public int RanchId { get; set; }

        public DateTime NewStartDate { get; set; }

        public DateTime NewEndDate { get; set; }

        public string? Notes { get; set; }

        public short? NewProductId { get; set; }
    }
}
