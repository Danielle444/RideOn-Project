using System;

namespace RideOnServer.BL.DTOs.ShavingsOrders
{
    public class CompetitionShavingsOrderListItem
    {
        public int ShavingsOrderId { get; set; }

        public DateTime? RequestedDeliveryTime { get; set; }

        public short? BagQuantity { get; set; }

        public string DeliveryStatus { get; set; } = string.Empty;

        public string? Notes { get; set; }

        public int? WorkerSystemUserId { get; set; }

        // Lifecycle timestamps (approval retired — Spec 1).
        // Seen = responsetime (worker took the order); Delivered = arrivaltime (canonical delivered-at);
        // PrequestDatetime = order creation clock (SLA source for Spec 2).
        public DateTime? Seen { get; set; }

        public DateTime? Delivered { get; set; }

        public DateTime? PrequestDatetime { get; set; }

        public string? OrderedByName { get; set; }

        public int? PriceCatalogId { get; set; }

        public decimal ItemPrice { get; set; }

        public decimal TotalAmount { get; set; }
    }
}
