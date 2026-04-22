using System;

namespace RideOnServer.BL.DTOs.ShavingsOrders
{
    public class ShavingsAvailableStallItem
    {
        public int StallBookingId { get; set; }
        public int? HorseId { get; set; }
        public string? HorseName { get; set; }
        public DateTime CheckInDate { get; set; }
        public DateTime CheckOutDate { get; set; }
        public short? StallCompoundId { get; set; }
        public short? StallId { get; set; }
    }
}