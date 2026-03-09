namespace RideOnServer.BL
{
    public class StallBookingShavingsOrder
    {
        public int StallBooking_PRequestId { get; set; }

        public int ShavingsOrder_PRequestId { get; set; }

        public short? BagQuantityPerStall { get; set; }

        public int? AssignedTo_SystemUserId { get; set; }
    }
}