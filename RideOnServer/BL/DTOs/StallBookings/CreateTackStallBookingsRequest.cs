using System;
using System.Collections.Generic;

namespace RideOnServer.BL.DTOs.StallBookings
{
    public class CreateTackStallBookingsRequest
    {
        public int CompetitionId { get; set; }
        public int OrderedBySystemUserId { get; set; }
        public int PriceCatalogId { get; set; }
        public string? Notes { get; set; }
        public int RanchId { get; set; }

        // Ranch-model fix (Phase 2, 2026-08-05): the guest/requesting ranch
        // for this tack stall -- there is no horse to derive it from, so it
        // must be supplied explicitly. The Controller authorizes the actor
        // against THIS value (not RanchId), and RanchId is overwritten
        // server-side with the competition's HostRanchId before the DAL call.
        public int RequestingRanchId { get; set; }

        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public int Quantity { get; set; }
        public List<CreateStallBookingPayerItem> Payers { get; set; } = new();
    }
}