using System;

namespace RideOnServer.BL.DTOs.StallBookings
{
    public class CompetitionStallBookingListItem
    {
        public int StallBookingId { get; set; }
        public int? HorseId { get; set; }
        public string? HorseName { get; set; }
        public bool IsForTack { get; set; }
        public DateTime startDate { get; set; }
        public DateTime endDate { get; set; }
        public short? CompoundId { get; set; }
        public short? StallId { get; set; }
        public int PriceCatalogId { get; set; }
        public decimal ItemPrice { get; set; }
        public string? Notes { get; set; }
        public DateTime? ApprovalDate { get; set; }
        public bool IsCancelled { get; set; }
        public bool HasApprovedChange { get; set; }
    }
}