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

        // DEP-1 (Spec 2): delivery photo URL, appended LAST to #176. Lets the secretary page flag a
        // "delivered without photo" (unverified) order. Null when no photo was uploaded.
        public string? DeliveryPhotoUrl { get; set; }
    }
}
