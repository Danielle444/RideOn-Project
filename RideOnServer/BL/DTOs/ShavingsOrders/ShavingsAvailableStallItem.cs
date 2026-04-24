using System;

namespace RideOnServer.BL.DTOs.ShavingsOrders
{
    public class ShavingsAvailableStallItem
    {
        public int StallBookingId { get; set; }
        public int? HorseId { get; set; }
        public string? HorseName { get; set; }
        public DateTime startDate { get; set; }
        public DateTime endDate { get; set; }
        public short? CompoundId { get; set; }
        public short? StallId { get; set; }
        public string? PayerNames { get; set; }
    }
}