using System;
using System.Collections.Generic;

namespace RideOnServer.BL.DTOs.StallBookings
{
    public class CreateTackStallBookingsRequest
    {
        public int CompetitionId { get; set; }
        public int OrderedBySystemUserId { get; set; }
        public int CatalogItemId { get; set; }
        public string? Notes { get; set; }
        public int RanchId { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public int Quantity { get; set; }
        public List<CreateStallBookingPayerItem> Payers { get; set; } = new();
    }
}