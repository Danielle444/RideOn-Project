using System;
using System.Collections.Generic;

namespace RideOnServer.BL.DTOs.ShavingsOrders
{
    public class CreateShavingsOrderRequest
    {
        public int CompetitionId { get; set; }
        public int OrderedBySystemUserId { get; set; }
        public int CatalogItemId { get; set; }
        public int RanchId { get; set; }
        public string? Notes { get; set; }
        public DateTime RequestedDeliveryTime { get; set; }
        public List<CreateShavingsOrderStallItem> Stalls { get; set; } = new();
    }
}