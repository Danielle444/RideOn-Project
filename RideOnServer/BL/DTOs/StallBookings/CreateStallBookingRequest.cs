using System;
using System.Collections.Generic;

namespace RideOnServer.BL.DTOs.StallBookings
{
    public class CreateStallBookingRequest
    {
        public int CompetitionId { get; set; }
        public int OrderedBySystemUserId { get; set; }
        public int PriceCatalogId { get; set; }
        public string? Notes { get; set; }
        public int RanchId { get; set; }
        public int HorseId { get; set; }
        public DateTime startDate { get; set; }
        public DateTime endDate { get; set; }
        public bool IsForTack { get; set; }
        public List<CreateStallBookingPayerItem> Payers { get; set; } = new();
    }
}