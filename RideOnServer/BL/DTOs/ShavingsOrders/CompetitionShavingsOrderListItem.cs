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
        public int? ApprovedByPersonId { get; set; }
        public DateTime? ApprovedAt { get; set; }
    }
}